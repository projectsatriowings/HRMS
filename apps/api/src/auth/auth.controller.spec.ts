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

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@hrms/shared-types';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockResponse: any;

  beforeEach(() => {
    mockAuthService = {
      login: jest.fn().mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'priya.hr@acme-example.test',
          firstName: 'Priya',
          lastName: 'Sharma',
          activeCompany: { id: 'acme-1', name: 'Acme Innovations', slug: 'acme-innovations' },
          activeRole: Role.HR_ADMIN,
          memberships: [],
        },
        tokens: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
        csrfToken: 'mock-csrf-token',
      }),
      getMe: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'priya.hr@acme-example.test',
        firstName: 'Priya',
        lastName: 'Sharma',
        activeRole: Role.HR_ADMIN,
        memberships: [],
      }),
      switchCompany: jest.fn().mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'priya.hr@acme-example.test',
          activeCompany: { id: 'zenith-1', name: 'Zenith Tech', slug: 'zenith-tech' },
          activeRole: Role.MANAGER,
          memberships: [],
        },
        tokens: {
          accessToken: 'mock-access-token-switched',
          refreshToken: 'mock-refresh-token-switched',
        },
        csrfToken: 'mock-csrf-token-switched',
      }),
      refreshToken: jest.fn().mockResolvedValue({
        user: { id: 'user-1' },
        tokens: { accessToken: 'new-acc', refreshToken: 'new-ref' },
        csrfToken: 'new-csrf',
      }),
      logout: jest.fn().mockResolvedValue(undefined),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    controller = new AuthController(mockAuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should authenticate user, set HttpOnly cookies, and return safe user with csrfToken', async () => {
      const result = await controller.login(
        { email: 'priya.hr@acme-example.test', password: 'Password123!' },
        { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any,
        mockResponse,
      );

      expect(result).toBeDefined();
      expect(result.user.email).toBe('priya.hr@acme-example.test');
      expect(result.csrfToken).toBe('mock-csrf-token');
      expect((result as any).tokens).toBeUndefined(); // Tokens not leaked in body

      // Verify HttpOnly cookie assignment
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'hrms_access_token',
        'mock-access-token',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'hrms_refresh_token',
        'mock-refresh-token',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'hrms_csrf_token',
        'mock-csrf-token',
        expect.objectContaining({ httpOnly: false, sameSite: 'lax' }),
      );
    });
  });

  describe('getMe', () => {
    it('should return current authenticated user profile', async () => {
      const result = await controller.getMe({
        id: 'user-1',
        email: 'priya.hr@acme-example.test',
        activeCompanyId: 'acme-1',
        role: Role.HR_ADMIN,
        sessionId: 'sess-1',
      });

      expect(result.id).toBe('user-1');
      expect(result.activeRole).toBe(Role.HR_ADMIN);
      expect(mockAuthService.getMe).toHaveBeenCalledWith('user-1', 'acme-1', Role.HR_ADMIN);
    });
  });

  describe('switchCompany', () => {
    it('should switch active company, update cookies, and return updated context', async () => {
      const result = await controller.switchCompany(
        {
          id: 'user-1',
          email: 'priya.hr@acme-example.test',
          activeCompanyId: 'acme-1',
          role: Role.HR_ADMIN,
          sessionId: 'sess-1',
        },
        { companyId: 'zenith-1' },
        mockResponse,
      );

      expect(result.user.activeCompany?.id).toBe('zenith-1');
      expect(result.user.activeRole).toBe(Role.MANAGER);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'hrms_access_token',
        'mock-access-token-switched',
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('should revoke session in database and clear all auth cookies', async () => {
      const result = await controller.logout(
        {
          id: 'user-1',
          email: 'priya.hr@acme-example.test',
          activeCompanyId: 'acme-1',
          role: Role.HR_ADMIN,
          sessionId: 'sess-1',
        },
        mockResponse,
      );

      expect(result.success).toBe(true);
      expect(mockAuthService.logout).toHaveBeenCalledWith('sess-1');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'hrms_access_token',
        expect.any(Object),
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'hrms_refresh_token',
        expect.any(Object),
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'hrms_csrf_token',
        expect.any(Object),
      );
    });
  });
});
