import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Refuses customer portal identities on staff routes that are protected by
 * JwtAuthGuard alone (no RbacGuard): /auth/me, sessions, login history,
 * logout-all, change-password, OTP, the in-app feed, push tokens. JwtAuthGuard
 * accepts both staff and portal tokens, so without this a portal token was let
 * into staff self-service (3.8_CustomerPortal BR-9.1). Layer after
 * JwtAuthGuard. RbacGuard already does the same for permission-guarded routes.
 */
@Injectable()
export class StaffUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (user?.userType === 'CUSTOMER') {
      throw new ForbiddenException(
        'Customer portal accounts cannot access staff functionality',
      );
    }
    return true;
  }
}
