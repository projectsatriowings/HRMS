import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // Safe read-only HTTP methods do not require CSRF tokens
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Check if session is authenticated via cookie
    const hasAuthCookie = Boolean(request.cookies?.hrms_access_token);
    if (!hasAuthCookie) {
      // If purely using Bearer header without cookies, browser CSRF is not applicable
      return true;
    }

    // Double Submit Cookie pattern:
    // Client must read the non-HttpOnly 'hrms_csrf_token' cookie and pass it in 'x-csrf-token' header
    const csrfCookie = request.cookies?.hrms_csrf_token;
    const csrfHeader =
      request.headers['x-csrf-token'] || request.headers['x-xsrf-token'];

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException(
        'CSRF verification failed: Missing or mismatched CSRF protection token',
      );
    }

    return true;
  }
}
