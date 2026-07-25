import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Restricts a route to platform (super-admin) identities.
 *
 * Platform modules (TENANTS, BILLING, SETTINGS) operate across every tenant by
 * design — their queries deliberately carry no `tenantId` predicate. Until now
 * the only thing keeping a tenant user out was the seed data: those permissions
 * are excluded from ADMIN_MANAGER_GRANTS, so no tenant role is granted them.
 * That is a data-level accident, not an enforced boundary — a single custom
 * role grant would have exposed cross-tenant billing and tenant records.
 *
 * This guard makes the boundary explicit at the request layer. Super-admin JWTs
 * carry `tenantId === 'SYSTEM'` (issued only against a matching row in the
 * separate SuperAdmin table, see JwtStrategy), which is the same signal
 * RbacGuard already trusts for its full-access short-circuit.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest()?.user;

    if (!user?.userId) {
      throw new ForbiddenException(
        'User context missing. Ensure JwtAuthGuard runs before PlatformAdminGuard.',
      );
    }

    if (user.tenantId !== 'SYSTEM') {
      throw new ForbiddenException(
        'This endpoint is restricted to platform administrators',
      );
    }

    return true;
  }
}
