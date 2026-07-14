import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUserContext } from '../lib/types/current-user.type';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserContext => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) {
      throw new UnauthorizedException('User context not found in token');
    }
    // JwtStrategy.validate() maps the JWT `sub` claim to `userId`;
    // fall back to `sub` for any raw-payload contexts.
    const userId = request.user.userId ?? request.user.sub;
    if (!userId) {
      throw new UnauthorizedException('User id missing from token context');
    }
    return {
      userId,
      email: request.user.email,
      tenantId: request.user.tenantId,
    };
  },
);
