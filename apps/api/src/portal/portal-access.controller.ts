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
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
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
import { PortalFeatureGuard } from './guards/portal-feature.guard';

export class UpdatePortalAccessDto {
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  readonly maxContacts?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  readonly faultReopenHours?: number;
}

/**
 * Super Admin controls for Customer Portal feature gating
 * (3.8_CustomerPortal BR-8.1). Restricted to platform identities: routes take
 * a `:tenantId` path param and write feature access for it, so the TENANTS
 * permission being absent from tenant role grants was the only barrier.
 * PlatformAdminGuard enforces it at the request layer instead.
 * Mirrors NetworkAccessController (3.7).
 */
@UseGuards(JwtAuthGuard, RbacGuard, PlatformAdminGuard)
@Controller('portal-access')
export class PortalAccessController {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly featureGuard: PortalFeatureGuard,
    private readonly auditService: AuditService,
  ) {}

  @Get(':tenantId')
  @RequirePermission('TENANTS', 'READ')
  async getAccess(@Param('tenantId') tenantId: string) {
    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
      select: {
        customerPortalEnabled: true,
        portalMaxContacts: true,
        portalFaultReopenHours: true,
      },
    });
    return {
      tenantId,
      enabled: settings?.customerPortalEnabled ?? false,
      maxContacts: settings?.portalMaxContacts ?? 5,
      faultReopenHours: settings?.portalFaultReopenHours ?? 72,
    };
  }

  @Patch(':tenantId')
  @RequirePermission('TENANTS', 'UPDATE')
  async updateAccess(
    @Param('tenantId') tenantId: string,
    @CurrentUser() currentUser: CurrentUserContext,
    @Body() dto: UpdatePortalAccessDto,
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
      data['customerPortalEnabled'] = dto.enabled;
    }
    if (dto.maxContacts !== undefined) {
      data['portalMaxContacts'] = dto.maxContacts;
    }
    if (dto.faultReopenHours !== undefined) {
      data['portalFaultReopenHours'] = dto.faultReopenHours;
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
      module: 'PORTAL_USERS',
      entityName: 'TenantSetting',
      entityId: settings.id,
      action: 'PORTAL_ACCESS_UPDATE',
      newValue: dto,
    });

    return {
      tenantId,
      enabled: settings.customerPortalEnabled,
      maxContacts: settings.portalMaxContacts,
      faultReopenHours: settings.portalFaultReopenHours,
    };
  }
}
