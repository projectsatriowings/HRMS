import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
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
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User session not established');
    }

    const activeCompanyId = user.activeCompanyId;
    if (!activeCompanyId && user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Active company membership required for tenant operations');
    }

    // Inspect if client attempted to supply a companyId via params, query, body, or header
    const suppliedCompanyIds: (string | undefined)[] = [
      request.params?.companyId,
      request.query?.companyId,
      request.body?.companyId,
      request.headers?.['x-company-id'],
    ];

    for (const supplied of suppliedCompanyIds) {
      if (supplied && typeof supplied === 'string' && supplied !== activeCompanyId) {
        throw new ForbiddenException(
          'Tenant isolation violation: Supplied companyId does not match server-verified active tenant',
        );
      }
    }

    // Server authoritative tenant assignment - never trust client input
    if (request.body && typeof request.body === 'object' && activeCompanyId) {
      request.body.companyId = activeCompanyId;
    }
    request.tenantId = activeCompanyId;

    return true;
  }
}
