import { Inject, Injectable } from '@nestjs/common';
import { IPrismaService, CurrentUserContext } from '@pingforce-monorepo/shared';
import { AuditService } from '../../audit/audit.service';
import {
  UpdatePortalSettingsDto,
  UpsertServiceRequestPolicyDto,
} from './dto/portal-settings.dto';

/**
 * Tenant-configurable portal commercial behavior (3.8_CustomerPortal §9.2).
 * PortalSettings is one row per tenant (upsert); ServiceRequestPolicy is one
 * row per tenant per request type. Read by ServiceRequestsService when routing.
 */
@Injectable()
export class PortalSettingsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getSettings(tenantId: string) {
    const existing = await this.prisma.portalSettings.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;
    // Materialize defaults on first read so the admin UI always has a row.
    return this.prisma.portalSettings.create({ data: { tenantId } });
  }

  async updateSettings(
    tenantId: string,
    user: CurrentUserContext,
    dto: UpdatePortalSettingsDto,
  ) {
    const updated = await this.prisma.portalSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...dto, createdBy: user.userId },
      update: { ...dto, updatedBy: user.userId },
    });
    void this.auditService.log({
      tenantId,
      actorId: user.userId,
      module: 'SERVICE_REQUESTS',
      entityName: 'PortalSettings',
      entityId: updated.id,
      action: 'UPDATE',
      newValue: dto,
    });
    return updated;
  }

  async listPolicies(tenantId: string) {
    return this.prisma.serviceRequestPolicy.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { requestType: 'asc' },
    });
  }

  async upsertPolicy(
    tenantId: string,
    user: CurrentUserContext,
    dto: UpsertServiceRequestPolicyDto,
  ) {
    const policy = await this.prisma.serviceRequestPolicy.upsert({
      where: {
        tenantId_requestType: { tenantId, requestType: dto.requestType },
      },
      create: {
        tenantId,
        requestType: dto.requestType,
        mode: dto.mode,
        limits: (dto.limits ?? null) as object | undefined,
        createdBy: user.userId,
      },
      update: {
        mode: dto.mode,
        limits: (dto.limits ?? null) as object | undefined,
        deletedAt: null,
        updatedBy: user.userId,
      },
    });
    void this.auditService.log({
      tenantId,
      actorId: user.userId,
      module: 'SERVICE_REQUESTS',
      entityName: 'ServiceRequestPolicy',
      entityId: policy.id,
      action: 'UPSERT',
      newValue: dto,
    });
    return policy;
  }
}
