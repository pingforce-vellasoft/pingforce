import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { IPrismaService } from '@pingforce-monorepo/shared';

const CACHE_TTL_MS = 60_000;

/**
 * Feature gate for the Customer Portal module (3.8_CustomerPortal BR-8.1).
 * Mirrors NetworkFeatureGuard: Super Admin controls
 * TenantSetting.customerPortalEnabled per tenant. Applies to both the
 * customer-facing portal routes and the staff-side portal-user management.
 */
@Injectable()
export class PortalFeatureGuard implements CanActivate {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new ForbiddenException(
        'User context missing. Ensure JwtAuthGuard runs before PortalFeatureGuard.',
      );
    }

    if (user.tenantId === 'SYSTEM') {
      return true;
    }

    if (!(await this.isEnabled(user.tenantId))) {
      throw new ForbiddenException(
        'The Customer Portal module is not enabled for this tenant',
      );
    }

    return true;
  }

  async isEnabled(tenantId: string): Promise<boolean> {
    const cacheKey = `portal_enabled_${tenantId}`;
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
      select: { customerPortalEnabled: true },
    });

    const enabled = settings?.customerPortalEnabled ?? false;
    await this.cacheManager.set(cacheKey, enabled, CACHE_TTL_MS);
    return enabled;
  }

  async invalidate(tenantId: string): Promise<void> {
    await this.cacheManager.del(`portal_enabled_${tenantId}`);
  }
}
