import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CurrentUserContext } from '../lib/types/current-user.type';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserContext => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) {
      throw new UnauthorizedException('User context not found in token');
    }
    return {
      userId: request.user.sub,
      email: request.user.email,
      tenantId: request.user.tenantId,
    };
  },
);
