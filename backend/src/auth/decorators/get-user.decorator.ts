import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ActiveUser {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export const GetUser = createParamDecorator(
  (data: keyof ActiveUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ActiveUser;

    return data ? user?.[data] : user;
  },
);
