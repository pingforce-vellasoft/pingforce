import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { PlatformAdminGuard } from '../rbac/guards/platform-admin.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import {
  IPrismaService,
  CurrentUser,
  CurrentUserContext,
} from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';
import { NetworkFeatureGuard } from './guards/network-feature.guard';

export const EMPLOYEE_ACCESS_LEVELS = ['NONE', 'VIEW', 'EDIT', 'FULL'] as const;

export class UpdateNetworkAccessDto {
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;

  @IsOptional()
  @IsIn(EMPLOYEE_ACCESS_LEVELS)
  readonly employeeAccess?: string;
}

/**
 * Super Admin controls for Connection Map feature gating (BRD BR-4.1/4.2).
 * Restricted to platform identities: every route takes a `:tenantId` path
 * param and writes feature access for it, so the TENANTS permission not being
 * in any tenant role's grants was the only thing preventing a tenant from
 * enabling the feature for itself (or for another tenant). PlatformAdminGuard
 * makes that boundary explicit rather than seed-data-dependent.
 */
@UseGuards(JwtAuthGuard, RbacGuard, PlatformAdminGuard)
@Controller('network/access')
export class NetworkAccessController {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly featureGuard: NetworkFeatureGuard,
    private readonly auditService: AuditService,
  ) {}

  @Get(':tenantId')
  @RequirePermission('TENANTS', 'READ')
  async getAccess(@Param('tenantId') tenantId: string) {
    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
      select: {
        connectionMapEnabled: true,
        connectionMapEmployeeAccess: true,
      },
    });
    return {
      tenantId,
      enabled: settings?.connectionMapEnabled ?? false,
      employeeAccess: settings?.connectionMapEmployeeAccess ?? 'NONE',
    };
  }

  @Patch(':tenantId')
  @RequirePermission('TENANTS', 'UPDATE')
  async updateAccess(
    @Param('tenantId') tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: UpdateNetworkAccessDto,
  ) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.enabled !== undefined) {
      data['connectionMapEnabled'] = dto.enabled;
    }
    if (dto.employeeAccess !== undefined) {
      data['connectionMapEmployeeAccess'] = dto.employeeAccess;
    }

    const settings = await this.prisma.tenantSetting.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });
    await this.featureGuard.invalidate(tenantId);

    void this.auditService.log({
      tenantId,
      actorId: currentUser.userId,
      module: 'NETWORK',
      entityName: 'TenantSetting',
      entityId: settings.id,
      action: 'NETWORK_ACCESS_UPDATE',
      newValue: dto,
    });

    return {
      tenantId,
      enabled: settings.connectionMapEnabled,
      employeeAccess: settings.connectionMapEmployeeAccess,
    };
  }
}
