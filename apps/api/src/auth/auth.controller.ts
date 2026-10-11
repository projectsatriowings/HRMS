import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SwitchCompanyDto } from './dto/switch-company.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { AuthSuccessResponse } from '@hrms/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login endpoint with rate limiting (5 attempts/min), HttpOnly session cookies, and CSRF token.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessResponse> {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { user, tokens, csrfToken } = await this.authService.login(
      loginDto,
      ip,
      userAgent,
    );

    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, csrfToken);

    return {
      user,
      csrfToken,
    };
  }

  /**
   * Current user endpoint resolving verified server-side session and company context.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.authService.getMe(user.id, user.activeCompanyId, user.role);
  }

  /**
   * Switch active company membership within authenticated session.
   */
  @UseGuards(JwtAuthGuard, CsrfGuard)
  @Post('switch-company')
  @HttpCode(HttpStatus.OK)
  async switchCompany(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() dto: SwitchCompanyDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessResponse> {
    const { user: updatedUser, tokens, csrfToken } =
      await this.authService.switchCompany(user.id, user.sessionId, dto.companyId);

    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, csrfToken);

    return {
      user: updatedUser,
      csrfToken,
    };
  }

  /**
   * Refresh session tokens using HttpOnly refresh cookie.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSuccessResponse> {
    const refreshToken = req.cookies?.hrms_refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const { user, tokens, csrfToken } = await this.authService.refreshToken(refreshToken);

    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken, csrfToken);

    return {
      user,
      csrfToken,
    };
  }

  /**
   * Safe logout with DB session revocation and cookie clearance.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (user?.sessionId) {
      await this.authService.logout(user.sessionId);
    }

    this.clearAuthCookies(res);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * Helper to set secure session cookies adhering to modern security standards.
   */
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    csrfToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    // 1. Short-lived Access Token (HttpOnly)
    res.cookie('hrms_access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // 2. Long-lived Session / Refresh Token (HttpOnly)
    res.cookie('hrms_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 3. Double-Submit CSRF Token (Readable by client JS, matched with x-csrf-token header)
    res.cookie('hrms_csrf_token', csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  /**
   * Helper to clear session cookies
   */
  private clearAuthCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('hrms_access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('hrms_refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('hrms_csrf_token', {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
