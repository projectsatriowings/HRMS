import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@hrms/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User has no assigned role in this context');
    }

    // Keep Platform Admin strictly separated from standard company administration
    if (user.role === Role.PLATFORM_ADMIN) {
      if (requiredRoles.includes(Role.PLATFORM_ADMIN)) {
        return true;
      }
      throw new ForbiddenException(
        'Platform Admin cannot perform standard company administration operations without explicit membership',
      );
    }

    // Standard company roles permission check
    const userRole = user.role as Role;

    // Check exact match
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    // Role inheritance hierarchy: OWNER has full company control (HR_ADMIN, MANAGER, EMPLOYEE)
    if (userRole === Role.OWNER && !requiredRoles.includes(Role.PLATFORM_ADMIN)) {
      return true;
    }

    // HR_ADMIN can perform MANAGER & EMPLOYEE operations
    if (
      userRole === Role.HR_ADMIN &&
      (requiredRoles.includes(Role.MANAGER) || requiredRoles.includes(Role.EMPLOYEE))
    ) {
      return true;
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required role(s): [${requiredRoles.join(', ')}], current role: ${userRole}`,
    );
  }
}
