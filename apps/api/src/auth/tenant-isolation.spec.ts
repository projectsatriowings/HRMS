import { ExecutionContext, ForbiddenException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

jest.mock('@nestjs/jwt', () => ({
  JwtService: class {
    signAsync = jest.fn();
    verifyAsync = jest.fn();
  },
}));

jest.mock('@nestjs/config', () => ({
  ConfigService: class {
    get = jest.fn();
  },
}));

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeService } from '../common/services/scope.service';
import { AuthService } from './auth.service';
import { Role } from '@hrms/shared-types';

describe('Tenant Isolation & Role Scoping Test Suite', () => {
  // Fictional Company 1: Acme Innovations
  const COMPANY_ACME_ID = 'acme-uuid-1111-2222-3333';
  // Fictional Company 2: Zenith Technologies
  const COMPANY_ZENITH_ID = 'zenith-uuid-4444-5555-6666';

  let reflector: Reflector;
  let jwtService: any;
  let mockPrisma: any;
  let jwtGuard: JwtAuthGuard;
  let tenantGuard: TenantGuard;
  let rolesGuard: RolesGuard;
  let scopeService: ScopeService;
  let authService: AuthService;

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn().mockImplementation(async (payload) => {
        return 'mock-jwt.' + Buffer.from(JSON.stringify(payload)).toString('base64');
      }),
      verifyAsync: jest.fn().mockImplementation(async (token) => {
        if (token && typeof token === 'string' && token.startsWith('mock-jwt.')) {
          return JSON.parse(Buffer.from(token.replace('mock-jwt.', ''), 'base64').toString());
        }
        throw new Error('Invalid token');
      }),
    } as any;

    reflector = new Reflector();

    mockPrisma = {
      session: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      membership: {
        findUnique: jest.fn(),
      },
      employee: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      leaveRequest: {
        findUnique: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
    };

    jwtGuard = new JwtAuthGuard(reflector, jwtService, mockPrisma);
    tenantGuard = new TenantGuard(reflector);
    rolesGuard = new RolesGuard(reflector);
    scopeService = new ScopeService(mockPrisma);
    authService = new AuthService(mockPrisma, jwtService, { get: () => '15m' } as any);
  });

  // ---------------------------------------------------------------------------
  // 1. Unauthenticated Access Test
  // ---------------------------------------------------------------------------
  describe('1. Unauthenticated Request Rejection', () => {
    it('should reject requests without authentication cookies or headers with UnauthorizedException', async () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            cookies: {},
            headers: {},
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(jwtGuard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject requests with expired or revoked database sessions', async () => {
      const token = await jwtService.signAsync({
        sub: 'user-1',
        email: 'priya.hr@acme-example.test',
        activeCompanyId: COMPANY_ACME_ID,
        role: Role.HR_ADMIN,
        sessionId: 'session-revoked-1',
      });

      // Session in DB marked as revoked
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-revoked-1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 100000),
      });

      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            cookies: { hrms_access_token: token },
            headers: {},
          }),
        }),
      } as unknown as ExecutionContext;

      await expect(jwtGuard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Cross-Tenant Data Isolation Test
  // ---------------------------------------------------------------------------
  describe('2. Cross-Company Data Isolation', () => {
    it('should prevent an Acme user from accessing an employee belonging to Zenith Technologies', async () => {
      const acmeUser = {
        id: 'user-acme-hr',
        email: 'priya.hr@acme-example.test',
        activeCompanyId: COMPANY_ACME_ID,
        role: Role.HR_ADMIN,
        sessionId: 'sess-1',
      };

      // Zenith employee target
      const zenithEmployee = {
        id: 'emp-zenith-1',
        companyId: COMPANY_ZENITH_ID, // Different company!
        firstName: 'Rohan',
        lastName: 'Verma',
      };

      mockPrisma.employee.findUnique.mockResolvedValue(zenithEmployee);

      await expect(
        scopeService.validateEmployeeAccess(acmeUser, 'emp-zenith-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow Acme HR Admin to access employees within Acme Innovations', async () => {
      const acmeUser = {
        id: 'user-acme-hr',
        email: 'priya.hr@acme-example.test',
        activeCompanyId: COMPANY_ACME_ID,
        role: Role.HR_ADMIN,
        sessionId: 'sess-1',
      };

      const acmeEmployee = {
        id: 'emp-acme-dev',
        companyId: COMPANY_ACME_ID, // Matching company!
        firstName: 'Ananya',
        lastName: 'Iyer',
      };

      mockPrisma.employee.findUnique.mockResolvedValue(acmeEmployee);

      const result = await scopeService.validateEmployeeAccess(acmeUser, 'emp-acme-dev');
      expect(result).toBeDefined();
      expect(result.id).toBe('emp-acme-dev');
      expect(result.companyId).toBe(COMPANY_ACME_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Request Tampering & Spoofing Prevention
  // ---------------------------------------------------------------------------
  describe('3. Request Body & URL Tamper Prevention', () => {
    it('should reject requests attempting to inject another companyId in request body', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'user-acme-dev',
              activeCompanyId: COMPANY_ACME_ID,
              role: Role.EMPLOYEE,
            },
            body: {
              companyId: COMPANY_ZENITH_ID, // Attacker tries to inject Zenith ID!
            },
            params: {},
            query: {},
            headers: {},
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => tenantGuard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should reject requests attempting to inject another companyId in URL parameters or headers', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              id: 'user-acme-dev',
              activeCompanyId: COMPANY_ACME_ID,
              role: Role.EMPLOYEE,
            },
            params: { companyId: COMPANY_ZENITH_ID },
            body: {},
            query: {},
            headers: { 'x-company-id': COMPANY_ZENITH_ID },
          }),
        }),
      } as unknown as ExecutionContext;

      expect(() => tenantGuard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Manager & Employee Scope Hierarchy Restrictions
  // ---------------------------------------------------------------------------
  describe('4. Manager Direct-Report & Employee Scope Restrictions', () => {
    it('should prevent an employee from viewing another employee confidential record', async () => {
      const employeeUser = {
        id: 'user-ananya-dev',
        email: 'ananya.dev@acme-example.test',
        activeCompanyId: COMPANY_ACME_ID,
        role: Role.EMPLOYEE,
        sessionId: 'sess-emp-1',
      };

      const anotherEmployee = {
        id: 'emp-kunal-sales',
        companyId: COMPANY_ACME_ID,
        userId: 'user-kunal-sales', // Different user ID!
        firstName: 'Kunal',
        lastName: 'Sen',
      };

      mockPrisma.employee.findUnique.mockResolvedValue(anotherEmployee);

      await expect(
        scopeService.validateEmployeeAccess(employeeUser, 'emp-kunal-sales'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent a manager from accessing an employee who is not their direct report', async () => {
      const managerUser = {
        id: 'user-rajesh-mgr',
        email: 'rajesh.manager@acme-example.test',
        activeCompanyId: COMPANY_ACME_ID,
        role: Role.MANAGER,
        sessionId: 'sess-mgr-1',
      };

      const managerEmployeeProfile = {
        id: 'emp-rajesh-mgr',
        userId: 'user-rajesh-mgr',
        companyId: COMPANY_ACME_ID,
      };

      // Employee who reports to someone else (managerId != emp-rajesh-mgr)
      const unassignedEmployee = {
        id: 'emp-kunal-sales',
        companyId: COMPANY_ACME_ID,
        managerId: 'different-manager-id',
      };

      mockPrisma.employee.findUnique.mockResolvedValue(unassignedEmployee);
      mockPrisma.employee.findFirst.mockResolvedValue(managerEmployeeProfile);

      await expect(
        scopeService.validateEmployeeAccess(managerUser, 'emp-kunal-sales'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow a manager to access their authorized direct report', async () => {
      const managerUser = {
        id: 'user-rajesh-mgr',
        email: 'rajesh.manager@acme-example.test',
        activeCompanyId: COMPANY_ACME_ID,
        role: Role.MANAGER,
        sessionId: 'sess-mgr-1',
      };

      const managerEmployeeProfile = {
        id: 'emp-rajesh-mgr',
        userId: 'user-rajesh-mgr',
        companyId: COMPANY_ACME_ID,
      };

      // Direct report has managerId matching manager's employee profile
      const directReportEmployee = {
        id: 'emp-ananya-dev',
        companyId: COMPANY_ACME_ID,
        managerId: 'emp-rajesh-mgr',
      };

      mockPrisma.employee.findUnique.mockResolvedValue(directReportEmployee);
      mockPrisma.employee.findFirst.mockResolvedValue(managerEmployeeProfile);

      const result = await scopeService.validateEmployeeAccess(managerUser, 'emp-ananya-dev');
      expect(result).toBeDefined();
      expect(result.id).toBe('emp-ananya-dev');
    });

    it('should prevent a manager from approving leave for employees outside their direct report scope', async () => {
      const managerUser = {
        id: 'user-rajesh-mgr',
        email: 'rajesh.manager@acme-example.test',
        activeCompanyId: COMPANY_ACME_ID,
        role: Role.MANAGER,
        sessionId: 'sess-mgr-1',
      };

      const managerEmployeeProfile = {
        id: 'emp-rajesh-mgr',
        userId: 'user-rajesh-mgr',
        companyId: COMPANY_ACME_ID,
      };

      const leaveRequest = {
        id: 'leave-100',
        companyId: COMPANY_ACME_ID,
        employee: {
          id: 'emp-other-sales',
          managerId: 'other-manager-id', // NOT Rajesh!
          firstName: 'Kunal',
          lastName: 'Sen',
        },
      };

      mockPrisma.leaveRequest.findUnique.mockResolvedValue(leaveRequest);
      mockPrisma.employee.findFirst.mockResolvedValue(managerEmployeeProfile);

      await expect(
        scopeService.validateApprovalScope(managerUser, 'leave-100'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Company Switching & Membership Verification
  // ---------------------------------------------------------------------------
  describe('5. Company Switching Verification', () => {
    it('should reject company switching when user holds no membership in target company', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue(null); // Not a member!

      await expect(
        authService.switchCompany('user-acme-dev', 'sess-1', COMPANY_ZENITH_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully switch company and revalidate session when user holds valid multi-company membership', async () => {
      const validZenithMembership = {
        id: 'mem-zenith-1',
        companyId: COMPANY_ZENITH_ID,
        userId: 'user-neha-consultant',
        role: Role.MANAGER,
        isActive: true,
        company: {
          id: COMPANY_ZENITH_ID,
          slug: 'zenith-tech',
          name: 'Zenith Technologies Pvt Ltd',
          code: 'ZENITH',
          timezone: 'Asia/Kolkata',
        },
      };

      mockPrisma.membership.findUnique.mockResolvedValue(validZenithMembership);
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'sess-multi-1',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 100000),
      });
      mockPrisma.session.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-neha-consultant',
        email: 'neha.consultant@example.test',
        firstName: 'Neha',
        lastName: 'Chopra',
        phone: '+919876543299',
        avatarUrl: null,
        memberships: [
          validZenithMembership,
          {
            id: 'mem-acme-1',
            companyId: COMPANY_ACME_ID,
            userId: 'user-neha-consultant',
            role: Role.EMPLOYEE,
            isActive: true,
            company: {
              id: COMPANY_ACME_ID,
              slug: 'acme-innovations',
              name: 'Acme Innovations Pvt Ltd',
            },
          },
        ],
      });
      mockPrisma.employee.findFirst.mockResolvedValue(null);

      const result = await authService.switchCompany(
        'user-neha-consultant',
        'sess-multi-1',
        COMPANY_ZENITH_ID,
      );

      expect(result).toBeDefined();
      expect(result.user.activeCompany?.id).toBe(COMPANY_ZENITH_ID);
      expect(result.user.activeRole).toBe(Role.MANAGER);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.csrfToken).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Security Sanitization (No Passwords or Secrets Leaked)
  // ---------------------------------------------------------------------------
  describe('6. Security Secret Sanitization', () => {
    it('should never expose password hashes, tokens, or internal secrets in user profile responses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'priya.hr@acme-example.test',
        passwordHash: '$2b$12$ya9P/UNbZwT91c5yoF8sbOj44k/njgsFwvxuWJZsYw6lRI2xrs9ra', // Sensitive hash!
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+919876543210',
        avatarUrl: null,
        memberships: [
          {
            id: 'mem-1',
            companyId: COMPANY_ACME_ID,
            role: Role.HR_ADMIN,
            isActive: true,
            company: {
              id: COMPANY_ACME_ID,
              slug: 'acme-innovations',
              name: 'Acme Innovations Pvt Ltd',
              code: 'ACME',
              timezone: 'Asia/Kolkata',
            },
          },
        ],
      });
      mockPrisma.employee.findFirst.mockResolvedValue(null);

      const profile = await authService.getMe('user-1', COMPANY_ACME_ID, Role.HR_ADMIN);

      expect(profile).toBeDefined();
      expect((profile as any).passwordHash).toBeUndefined();
      expect((profile as any).password).toBeUndefined();
      expect((profile as any).tokenHash).toBeUndefined();
      expect(profile.email).toBe('priya.hr@acme-example.test');
      expect(profile.activeRole).toBe(Role.HR_ADMIN);
    });
  });
});
