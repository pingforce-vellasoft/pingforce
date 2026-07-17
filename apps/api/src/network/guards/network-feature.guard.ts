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

export interface NetworkAccessConfig {
  readonly enabled: boolean;
  readonly employeeAccess: 'NONE' | 'VIEW' | 'EDIT' | 'FULL';
}

const CACHE_TTL_MS = 60_000;
const ADMIN_ROLE_CODES = ['SUPER_ADMIN', 'ADMIN_MANAGER'];

/**
 * Feature gate for the Connection Map module (3.7_ConnectionMap).
 *
 * Layered on top of JwtAuthGuard + RbacGuard:
 *  - Super Admin (tenantId SYSTEM) always passes — they administer the flag.
 *  - Tenant users require TenantSetting.connectionMapEnabled.
 *  - Non-admin (employee) users are additionally capped by
 *    connectionMapEmployeeAccess: NONE blocks all, VIEW blocks mutations.
 *    Fine-grained rights below the cap remain RbacGuard's job.
 */
@Injectable()
export class NetworkFeatureGuard implements CanActivate {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException(
        'User context missing. Ensure JwtAuthGuard runs before NetworkFeatureGuard.',
      );
    }

    if (user.tenantId === 'SYSTEM') {
      return true;
    }

    const config = await this.getAccessConfig(user.tenantId);

    if (!config.enabled) {
      throw new ForbiddenException(
        'The Connection Map module is not enabled for this tenant',
      );
    }

    if (ADMIN_ROLE_CODES.includes(user.roleCode)) {
      return true;
    }

    if (config.employeeAccess === 'NONE') {
      throw new ForbiddenException(
        'Connection Map access is not enabled for employees of this tenant',
      );
    }

    const isMutation = request.method !== 'GET';
    if (isMutation && config.employeeAccess === 'VIEW') {
      throw new ForbiddenException(
        'Employees of this tenant have view-only Connection Map access',
      );
    }

    return true;
  }

  async getAccessConfig(tenantId: string): Promise<NetworkAccessConfig> {
    const cacheKey = `network_access_${tenantId}`;
    const cached = await this.cacheManager.get<NetworkAccessConfig>(cacheKey);
    if (cached) {
      return cached;
    }

    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
      select: {
        connectionMapEnabled: true,
        connectionMapEmployeeAccess: true,
      },
    });

    const config: NetworkAccessConfig = {
      enabled: settings?.connectionMapEnabled ?? false,
      employeeAccess: (settings?.connectionMapEmployeeAccess ??
        'NONE') as NetworkAccessConfig['employeeAccess'],
    };

    await this.cacheManager.set(cacheKey, config, CACHE_TTL_MS);
    return config;
  }

  async invalidate(tenantId: string): Promise<void> {
    await this.cacheManager.del(`network_access_${tenantId}`);
  }
}
