import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPrismaService, CurrentUserContext } from '@pingforce-monorepo/shared';
import { AuditService } from '../../audit/audit.service';
import {
  CreateServicePlanDto,
  UpdateServicePlanDto,
} from './dto/service-plan.dto';
import { CreateAddOnDto, UpdateAddOnDto } from './dto/addon.dto';

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

/**
 * Staff-side CRUD for the service catalog (3.8_CustomerPortal P3): tenant-defined
 * ServicePlan and AddOn records. The portal exposes only the active subset
 * read-only (see CatalogPortalService); all writes are here, RBAC-guarded and
 * tenant-scoped. Soft-delete only.
 */
@Injectable()
export class CatalogService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---- Service plans -------------------------------------------------------

  async createPlan(
    tenantId: string,
    user: CurrentUserContext,
    dto: CreateServicePlanDto,
  ): Promise<unknown> {
    const plan = await this.prisma.servicePlan.create({
      data: { ...dto, tenantId, createdBy: user.userId },
    });
    void this.auditService.log({
      tenantId,
      actorId: user.userId,
      module: 'PORTAL_CATALOG',
      entityName: 'ServicePlan',
      entityId: plan.id,
      action: 'CREATE',
      newValue: dto,
    });
    return plan;
  }

  async listPlans(
    tenantId: string,
    opts: { skip?: number; take?: number; activeOnly?: boolean } = {},
  ): Promise<unknown[]> {
    return this.prisma.servicePlan.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(opts.activeOnly ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
      skip: opts.skip ?? 0,
      take: Math.min(opts.take ?? DEFAULT_TAKE, MAX_TAKE),
    });
  }

  async updatePlan(
    tenantId: string,
    user: CurrentUserContext,
    id: string,
    dto: UpdateServicePlanDto,
  ): Promise<unknown> {
    await this.requirePlan(tenantId, id);
    const plan = await this.prisma.servicePlan.update({
      where: { id },
      data: { ...dto, updatedBy: user.userId },
    });
    void this.auditService.log({
      tenantId,
      actorId: user.userId,
      module: 'PORTAL_CATALOG',
      entityName: 'ServicePlan',
      entityId: id,
      action: 'UPDATE',
      newValue: dto,
    });
    return plan;
  }

  async archivePlan(
    tenantId: string,
    user: CurrentUserContext,
    id: string,
  ): Promise<{ message: string }> {
    await this.requirePlan(tenantId, id);
    await this.prisma.servicePlan.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: user.userId },
    });
    void this.auditService.log({
      tenantId,
      actorId: user.userId,
      module: 'PORTAL_CATALOG',
      entityName: 'ServicePlan',
      entityId: id,
      action: 'DELETE',
    });
    return { message: 'Service plan archived' };
  }

  // ---- Add-ons -------------------------------------------------------------

  async createAddOn(
    tenantId: string,
    user: CurrentUserContext,
    dto: CreateAddOnDto,
  ): Promise<unknown> {
    const addOn = await this.prisma.addOn.create({
      data: { ...dto, tenantId, createdBy: user.userId },
    });
    void this.auditService.log({
      tenantId,
      actorId: user.userId,
      module: 'PORTAL_CATALOG',
      entityName: 'AddOn',
      entityId: addOn.id,
      action: 'CREATE',
      newValue: dto,
    });
    return addOn;
  }

  async listAddOns(
    tenantId: string,
    opts: { skip?: number; take?: number; activeOnly?: boolean } = {},
  ): Promise<unknown[]> {
    return this.prisma.addOn.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(opts.activeOnly ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
      skip: opts.skip ?? 0,
      take: Math.min(opts.take ?? DEFAULT_TAKE, MAX_TAKE),
    });
  }

  async updateAddOn(
    tenantId: string,
    user: CurrentUserContext,
    id: string,
    dto: UpdateAddOnDto,
  ): Promise<unknown> {
    await this.requireAddOn(tenantId, id);
    const addOn = await this.prisma.addOn.update({
      where: { id },
      data: { ...dto, updatedBy: user.userId },
    });
    void this.auditService.log({
      tenantId,
      actorId: user.userId,
      module: 'PORTAL_CATALOG',
      entityName: 'AddOn',
      entityId: id,
      action: 'UPDATE',
      newValue: dto,
    });
    return addOn;
  }

  async archiveAddOn(
    tenantId: string,
    user: CurrentUserContext,
    id: string,
  ): Promise<{ message: string }> {
    await this.requireAddOn(tenantId, id);
    await this.prisma.addOn.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: user.userId },
    });
    void this.auditService.log({
      tenantId,
      actorId: user.userId,
      module: 'PORTAL_CATALOG',
      entityName: 'AddOn',
      entityId: id,
      action: 'DELETE',
    });
    return { message: 'Add-on archived' };
  }

  // ---- guards --------------------------------------------------------------

  private async requirePlan(tenantId: string, id: string): Promise<void> {
    const plan = await this.prisma.servicePlan.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!plan) throw new NotFoundException('Service plan not found');
  }

  private async requireAddOn(tenantId: string, id: string): Promise<void> {
    const addOn = await this.prisma.addOn.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!addOn) throw new NotFoundException('Add-on not found');
  }
}
