import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '@hrms/shared-types';

export interface JwtPayload {
  sub: string;
  email: string;
  activeCompanyId?: string;
  role?: Role;
  sessionId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing or invalid');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // Verify session state in database to allow immediate session revocation
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || session.isRevoked || session.expiresAt <= new Date()) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      // Verify user existence and active status
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
        throw new UnauthorizedException('User account inactive or not found');
      }

      // Determine active company from session / payload
      const targetCompanyId = session.companyId || payload.activeCompanyId;
      const verifiedMembership = user.memberships.find(
        (m) => m.companyId === targetCompanyId,
      );

      // For normal users, verified company membership is strictly required
      if (!verifiedMembership) {
        // Check if Platform Admin
        if (payload.role === Role.PLATFORM_ADMIN) {
          request.user = {
            id: user.id,
            email: user.email,
            activeCompanyId: null,
            role: Role.PLATFORM_ADMIN,
            sessionId: session.id,
          };
          return true;
        }

        // If user has other active memberships, fallback to first active membership
        if (user.memberships.length > 0) {
          const fallback = user.memberships[0];
          request.user = {
            id: user.id,
            email: user.email,
            activeCompanyId: fallback.companyId,
            role: fallback.role as Role,
            sessionId: session.id,
          };
          return true;
        }

        throw new UnauthorizedException('User has no active company memberships');
      }

      request.user = {
        id: user.id,
        email: user.email,
        activeCompanyId: verifiedMembership.companyId,
        role: verifiedMembership.role as Role,
        sessionId: session.id,
      };

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired authentication session');
    }
  }

  private extractTokenFromRequest(request: any): string | null {
    // 1. Primary: HttpOnly Cookie
    if (request.cookies && request.cookies.hrms_access_token) {
      return request.cookies.hrms_access_token;
    }

    // 2. Secondary: Authorization Bearer header
    const authHeader = request.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ');
      if (type?.toLowerCase() === 'bearer' && token) {
        return token;
      }
    }

    return null;
  }
}
