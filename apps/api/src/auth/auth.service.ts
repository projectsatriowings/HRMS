import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Role, AuthUserResponse, MembershipSummary, CompanySummary, EmployeeBrief } from '@hrms/shared-types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Securely hash passwords with bcrypt (12 rounds)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Verify password against bcrypt hash with timing safety
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Authenticate user credentials and return user with active memberships
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        memberships: {
          where: { isActive: true },
          include: { company: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  /**
   * Authenticate and initialize a secure session with HttpOnly cookies
   */
  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // Determine target active company from verified server-side memberships
    let activeCompanyId: string | null = null;
    let activeRole: Role | null = null;

    if (loginDto.companyId) {
      const match = user.memberships.find((m) => m.companyId === loginDto.companyId);
      if (!match) {
        throw new ForbiddenException(
          'Tenant isolation violation: User holds no active membership in requested company',
        );
      }
      activeCompanyId = match.companyId;
      activeRole = match.role as Role;
    } else if (user.memberships.length > 0) {
      // Default to first active company membership
      activeCompanyId = user.memberships[0].companyId;
      activeRole = user.memberships[0].role as Role;
    }

    // Generate session in database for revocation tracking
    const tokenHash = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        companyId: activeCompanyId,
        ipAddress: ip || null,
        userAgent: userAgent || null,
        expiresAt: sessionExpiresAt,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken, csrfToken } = await this.generateTokens(
      user.id,
      user.email,
      activeCompanyId,
      activeRole,
      session.id,
    );

    const userProfile = await this.buildUserProfile(user.id, activeCompanyId, activeRole);

    return {
      user: userProfile,
      tokens: { accessToken, refreshToken },
      csrfToken,
    };
  }

  /**
   * Switch the active company within an active authenticated session
   */
  async switchCompany(userId: string, sessionId: string, targetCompanyId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        companyId_userId: {
          companyId: targetCompanyId,
          userId,
        },
      },
      include: { company: true },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException(
        'Switch forbidden: You do not have an active membership in the target company',
      );
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.isRevoked || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // Update active company in database session
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { companyId: targetCompanyId },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeRole = membership.role as Role;
    const { accessToken, refreshToken, csrfToken } = await this.generateTokens(
      user.id,
      user.email,
      targetCompanyId,
      activeRole,
      session.id,
    );

    const userProfile = await this.buildUserProfile(user.id, targetCompanyId, activeRole);

    return {
      user: userProfile,
      tokens: { accessToken, refreshToken },
      csrfToken,
    };
  }

  /**
   * Revoke session on logout
   */
  async logout(sessionId: string) {
    if (!sessionId) return;
    try {
      await this.prisma.session.updateMany({
        where: { id: sessionId },
        data: { isRevoked: true },
      });
    } catch (err) {
      this.logger.warn(`Failed to mark session ${sessionId} as revoked: ${(err as Error).message}`);
    }
  }

  /**
   * Rotate access and refresh tokens using an active refresh token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        sessionId: string;
        type: string;
      }>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || session.isRevoked || session.expiresAt <= new Date()) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          memberships: {
            where: { isActive: true },
            include: { company: true },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account inactive');
      }

      const activeCompanyId = session.companyId;
      const membership = user.memberships.find((m) => m.companyId === activeCompanyId);
      const activeRole = (membership?.role as Role) || null;

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        activeCompanyId,
        activeRole,
        session.id,
      );

      const userProfile = await this.buildUserProfile(user.id, activeCompanyId, activeRole);

      return {
        user: userProfile,
        tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
        csrfToken: tokens.csrfToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Retrieve current user profile and company context
   */
  async getMe(userId: string, activeCompanyId: string | null, activeRole: Role | null) {
    return this.buildUserProfile(userId, activeCompanyId, activeRole);
  }

  /**
   * Helper to generate JWT tokens and CSRF token
   */
  private async generateTokens(
    userId: string,
    email: string,
    activeCompanyId: string | null,
    activeRole: Role | null,
    sessionId: string,
  ) {
    const accessPayload = {
      sub: userId,
      email,
      activeCompanyId,
      role: activeRole,
      sessionId,
    };

    const refreshPayload = {
      sub: userId,
      sessionId,
      type: 'refresh',
    };

    const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: accessTokenExpiresIn as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: refreshTokenExpiresIn as any,
      }),
    ]);

    const csrfToken = crypto.randomBytes(24).toString('hex');

    return { accessToken, refreshToken, csrfToken };
  }

  /**
   * Helper to build safe user response without secrets or hashes
   */
  private async buildUserProfile(
    userId: string,
    activeCompanyId: string | null,
    activeRole: Role | null,
  ): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: { company: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const memberships: MembershipSummary[] = user.memberships.map((m) => ({
      id: m.id,
      companyId: m.companyId,
      role: m.role as Role,
      company: {
        id: m.company.id,
        slug: m.company.slug,
        name: m.company.name,
        code: m.company.code,
        timezone: m.company.timezone,
      },
    }));

    let activeCompany: CompanySummary | null = null;
    let employeeProfile: EmployeeBrief | null = null;

    if (activeCompanyId) {
      const activeMem = memberships.find((m) => m.companyId === activeCompanyId);
      if (activeMem) {
        activeCompany = activeMem.company;
      }

      const emp = await this.prisma.employee.findFirst({
        where: {
          userId: user.id,
          companyId: activeCompanyId,
        },
        include: { department: true },
      });

      if (emp) {
        employeeProfile = {
          id: emp.id,
          employeeCode: emp.employeeCode,
          designation: emp.designation,
          departmentName: emp.department?.name || null,
          managerId: emp.managerId,
        };
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      memberships,
      activeCompany,
      activeRole: activeRole || (memberships.length > 0 ? memberships[0].role : null),
      employeeProfile,
    };
  }
}
