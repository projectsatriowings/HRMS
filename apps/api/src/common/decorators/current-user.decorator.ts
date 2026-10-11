import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@hrms/shared-types';

export interface AuthenticatedUserPayload {
  id: string;
  email: string;
  activeCompanyId: string;
  role: Role;
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
