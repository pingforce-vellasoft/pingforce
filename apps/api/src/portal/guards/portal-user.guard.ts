import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Asserts the authenticated identity is a customer portal user
 * (3.8_CustomerPortal BR-9.1). Layered after JwtAuthGuard, which attaches
 * userType: 'CUSTOMER' for portal tokens. Staff and super-admin tokens are
 * rejected — the portal API surface is customer-only.
 */
@Injectable()
export class PortalUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException(
        'User context missing. Ensure JwtAuthGuard runs before PortalUserGuard.',
      );
    }

    if (user.userType !== 'CUSTOMER' || !user.customerId) {
      throw new ForbiddenException(
        'This endpoint is only available to customer portal accounts',
      );
    }

    return true;
  }
}
