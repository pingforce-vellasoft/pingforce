import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { IPrismaService, CurrentUserContext } from '@pingforce-monorepo/shared';
import { AuditService } from '../../audit/audit.service';
import {
  PortalCreateServiceRequestDto,
  PortalListServiceRequestQueryDto,
  StaffTransitionServiceRequestDto,
} from './dto/service-request.dto';

const MAX_OPEN_REQUESTS_PER_CUSTOMER = 10;

// Legal staff-driven transitions (submit + auto-approve are server-internal).
const ALLOWED_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['SCHEDULED', 'IN_PROGRESS', 'REJECTED'],
  SCHEDULED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['COMPLETED', 'REJECTED'],
};

const TERMINAL_STATUSES = ['COMPLETED', 'REJECTED', 'CANCELLED'];

// Customer-safe projection — no staff ids/emails, no internal payload leakage
// beyond what the customer submitted.
const PORTAL_SR_SELECT = {
  id: true,
  requestNumber: true,
  type: true,
  status: true,
  payload: true,
  connectionId: true,
  scheduledAt: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Service-request engine (3.8_CustomerPortal P4, spec §4.2). One generic model
 * covers every self-service request type. On submit the tenant's
 * ServiceRequestPolicy decides routing: AUTO → APPROVED immediately, APPROVAL →
 * UNDER_REVIEW into the staff queue, AUTO_WITH_LIMITS → approved only within the
 * configured limit. PLAN_CHANGE is resolved to upgrade/downgrade by price so the
 * right policy row applies. All portal access scoped tenantId + customerId from
 * the JWT (BR-9.2).
 */
@Injectable()
export class ServiceRequestsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---- Portal (customer) side ---------------------------------------------

  async submit(
    tenantId: string,
    customerId: string,
    portalUserId: string,
    dto: PortalCreateServiceRequestDto,
  ) {
    const openCount = await this.prisma.serviceRequest.count({
      where: {
        tenantId,
        customerId,
        deletedAt: null,
        status: { notIn: TERMINAL_STATUSES },
      },
    });
    if (openCount >= MAX_OPEN_REQUESTS_PER_CUSTOMER) {
      throw new BadRequestException(
        'Too many open requests on this account. Please wait for existing ones to complete.',
      );
    }

    const connection = await this.resolveConnection(
      tenantId,
      customerId,
      dto.connectionId,
    );

    // Validate payload against the tenant catalog and derive the policy key.
    const policyKey = await this.validateAndClassify(tenantId, dto, connection);

    const { status, assignmentNote } = await this.applyPolicy(
      tenantId,
      customerId,
      policyKey,
      dto,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const sr = await tx.serviceRequest.create({
        data: {
          tenantId,
          customerId,
          connectionId: connection?.id ?? null,
          requestNumber: this.generateRequestNumber(),
          type: dto.type,
          status,
          payload: dto.payload as object,
          requestedById: portalUserId,
          createdBy: portalUserId,
          ...(status === 'APPROVED' ? { resolvedAt: null } : {}),
        },
        select: PORTAL_SR_SELECT,
      });
      await tx.serviceRequestTimeline.create({
        data: {
          tenantId,
          serviceRequestId: sr.id,
          fromStatus: null,
          toStatus: 'SUBMITTED',
          note: dto.note ?? 'Request submitted via customer portal',
          actorType: 'CUSTOMER',
          actorId: portalUserId,
        },
      });
      if (status !== 'SUBMITTED') {
        await tx.serviceRequestTimeline.create({
          data: {
            tenantId,
            serviceRequestId: sr.id,
            fromStatus: 'SUBMITTED',
            toStatus: status,
            note: assignmentNote,
            actorType: 'SYSTEM',
            actorId: null,
          },
        });
      }
      return sr;
    });

    void this.auditService.log({
      tenantId,
      actorId: portalUserId,
      module: 'SERVICE_REQUESTS',
      entityName: 'ServiceRequest',
      entityId: created.id,
      action: 'PORTAL_SR_SUBMITTED',
      newValue: {
        type: dto.type,
        requestNumber: created.requestNumber,
        status,
      },
    });

    return created;
  }

  async listOwn(
    tenantId: string,
    customerId: string,
    query: PortalListServiceRequestQueryDto,
  ) {
    return this.prisma.serviceRequest.findMany({
      where: {
        tenantId,
        customerId,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
      },
      select: PORTAL_SR_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: query.skip ?? 0,
      take: query.take ?? 20,
    });
  }

  async findOwn(tenantId: string, customerId: string, id: string) {
    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id, tenantId, customerId, deletedAt: null },
      select: {
        ...PORTAL_SR_SELECT,
        timeline: {
          select: {
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!sr) throw new NotFoundException('Request not found');
    return sr;
  }

  async cancelOwn(
    tenantId: string,
    customerId: string,
    portalUserId: string,
    id: string,
  ) {
    const sr = await this.requireOwn(tenantId, customerId, id);
    if (TERMINAL_STATUSES.includes(sr.status)) {
      throw new BadRequestException('This request can no longer be cancelled');
    }
    if (['IN_PROGRESS', 'SCHEDULED'].includes(sr.status)) {
      throw new BadRequestException(
        'Work has already started; contact support to cancel',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          resolvedAt: new Date(),
          updatedBy: portalUserId,
        },
      });
      await tx.serviceRequestTimeline.create({
        data: {
          tenantId,
          serviceRequestId: id,
          fromStatus: sr.status,
          toStatus: 'CANCELLED',
          note: 'Cancelled by customer',
          actorType: 'CUSTOMER',
          actorId: portalUserId,
        },
      });
    });
    return { message: 'Request cancelled' };
  }

  // ---- Staff side ----------------------------------------------------------

  async listQueue(
    tenantId: string,
    opts: {
      status?: string;
      assignedToId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.serviceRequest.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.assignedToId ? { assignedToId: opts.assignedToId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      skip: opts.skip ?? 0,
      take: Math.min(opts.take ?? 50, 200),
    });
  }

  async findForStaff(tenantId: string, id: string) {
    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        timeline: { orderBy: { createdAt: 'desc' } },
        customer: {
          select: { customerCode: true, displayName: true, legalName: true },
        },
      },
    });
    if (!sr) throw new NotFoundException('Request not found');
    return sr;
  }

  async transition(
    tenantId: string,
    user: CurrentUserContext,
    id: string,
    dto: StaffTransitionServiceRequestDto,
  ) {
    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!sr) throw new NotFoundException('Request not found');

    const allowed = ALLOWED_TRANSITIONS[sr.status] ?? [];
    if (!allowed.includes(dto.toStatus)) {
      throw new BadRequestException(
        `Cannot move request from ${sr.status} to ${dto.toStatus}`,
      );
    }

    const resolved = ['COMPLETED', 'REJECTED'].includes(dto.toStatus);
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.serviceRequest.update({
        where: { id },
        data: {
          status: dto.toStatus,
          ...(dto.assignedToId ? { assignedToId: dto.assignedToId } : {}),
          ...(dto.scheduledAt ? { scheduledAt: dto.scheduledAt } : {}),
          ...(resolved ? { resolvedAt: new Date() } : {}),
          updatedBy: user.userId,
        },
      });
      await tx.serviceRequestTimeline.create({
        data: {
          tenantId,
          serviceRequestId: id,
          fromStatus: sr.status,
          toStatus: dto.toStatus,
          note: dto.note ?? null,
          actorType: 'STAFF',
          actorId: user.userId,
        },
      });
      return u;
    });

    void this.auditService.log({
      tenantId,
      actorId: user.userId,
      module: 'SERVICE_REQUESTS',
      entityName: 'ServiceRequest',
      entityId: id,
      action: 'SR_TRANSITION',
      oldValue: { status: sr.status },
      newValue: { status: dto.toStatus },
    });
    return updated;
  }

  // ---- Policy engine -------------------------------------------------------

  /**
   * Validate the payload against the tenant catalog / connection and return the
   * ServiceRequestPolicy key. PLAN_CHANGE splits into UPGRADE/DOWNGRADE by price
   * so the tenant can route them differently (spec §9.2 decision 4).
   */
  private async validateAndClassify(
    tenantId: string,
    dto: PortalCreateServiceRequestDto,
    connection: { id: string; servicePlanId: string | null } | null,
  ): Promise<string> {
    const payload = dto.payload ?? {};
    switch (dto.type) {
      case 'PLAN_CHANGE':
      case 'SPEED_UPGRADE': {
        const targetPlanId = payload['targetPlanId'];
        if (typeof targetPlanId !== 'string') {
          throw new BadRequestException('targetPlanId is required');
        }
        const target = await this.prisma.servicePlan.findFirst({
          where: {
            id: targetPlanId,
            tenantId,
            deletedAt: null,
            isActive: true,
          },
          select: { id: true, price: true },
        });
        if (!target) throw new BadRequestException('Target plan not found');

        const currentPlan = connection?.servicePlanId
          ? await this.prisma.servicePlan.findFirst({
              where: { id: connection.servicePlanId, tenantId },
              select: { price: true },
            })
          : null;

        if (dto.type === 'SPEED_UPGRADE') return 'PLAN_CHANGE_UPGRADE';
        // Decimal comparison: upgrade when target costs more than current.
        const isUpgrade =
          !currentPlan || Number(target.price) >= Number(currentPlan.price);
        return isUpgrade ? 'PLAN_CHANGE_UPGRADE' : 'PLAN_CHANGE_DOWNGRADE';
      }
      case 'ADDON_ADD':
      case 'ADDON_REMOVE': {
        const addOnId = payload['addOnId'];
        if (typeof addOnId !== 'string') {
          throw new BadRequestException('addOnId is required');
        }
        const addOn = await this.prisma.addOn.findFirst({
          where: { id: addOnId, tenantId, deletedAt: null, isActive: true },
          select: { id: true },
        });
        if (!addOn) throw new BadRequestException('Add-on not found');
        return dto.type;
      }
      case 'RELOCATION': {
        if (typeof payload['newAddress'] !== 'string') {
          throw new BadRequestException('newAddress is required');
        }
        return dto.type;
      }
      default:
        return dto.type; // SUSPENSION, RESUMPTION, TERMINATION, OTHER
    }
  }

  /**
   * Resolve the routing decision from the tenant's ServiceRequestPolicy. Default
   * (no row) is APPROVAL — the safe choice (staff sees it). Returns the initial
   * status and a system timeline note.
   */
  private async applyPolicy(
    tenantId: string,
    customerId: string,
    policyKey: string,
    dto: PortalCreateServiceRequestDto,
  ): Promise<{ status: string; assignmentNote: string }> {
    const policy = await this.prisma.serviceRequestPolicy.findFirst({
      where: { tenantId, requestType: policyKey, deletedAt: null },
      select: { mode: true, limits: true },
    });
    const mode = policy?.mode ?? 'APPROVAL';

    if (mode === 'AUTO') {
      return {
        status: 'APPROVED',
        assignmentNote: 'Auto-approved by tenant policy',
      };
    }
    if (mode === 'AUTO_WITH_LIMITS') {
      const withinLimit = await this.checkLimits(
        tenantId,
        customerId,
        policyKey,
        dto,
        policy?.limits ?? null,
      );
      return withinLimit
        ? {
            status: 'APPROVED',
            assignmentNote: 'Auto-approved within policy limits',
          }
        : {
            status: 'UNDER_REVIEW',
            assignmentNote: 'Exceeds auto-approval limits — routed for review',
          };
    }
    return {
      status: 'UNDER_REVIEW',
      assignmentNote: 'Routed for staff review',
    };
  }

  /**
   * AUTO_WITH_LIMITS check. Currently supports maxSuspensionDaysPerYear for
   * SUSPENSION (spec §9.2 decision 4 seed default: 30 days/year). Unknown limit
   * shapes fail closed (route for review).
   */
  private async checkLimits(
    tenantId: string,
    customerId: string,
    policyKey: string,
    dto: PortalCreateServiceRequestDto,
    limits: unknown,
  ): Promise<boolean> {
    if (policyKey !== 'SUSPENSION' || !limits || typeof limits !== 'object') {
      return false;
    }
    const maxDays = (limits as Record<string, unknown>)[
      'maxSuspensionDaysPerYear'
    ];
    if (typeof maxDays !== 'number') return false;

    const requestedDays = Number((dto.payload ?? {})['days'] ?? 0);
    if (!Number.isFinite(requestedDays) || requestedDays <= 0) return false;

    const yearStart = new Date();
    yearStart.setMonth(0, 1);
    yearStart.setHours(0, 0, 0, 0);

    const priorSuspensions = await this.prisma.serviceRequest.findMany({
      where: {
        tenantId,
        customerId,
        type: 'SUSPENSION',
        deletedAt: null,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
        createdAt: { gte: yearStart },
      },
      select: { payload: true },
    });
    const usedDays = priorSuspensions.reduce((sum, r) => {
      const d = Number((r.payload as Record<string, unknown>)?.['days'] ?? 0);
      return sum + (Number.isFinite(d) ? d : 0);
    }, 0);

    return usedDays + requestedDays <= maxDays;
  }

  // ---- helpers -------------------------------------------------------------

  private async resolveConnection(
    tenantId: string,
    customerId: string,
    connectionId?: string,
  ): Promise<{ id: string; servicePlanId: string | null } | null> {
    if (!connectionId) return null;
    const connection = await this.prisma.networkConnection.findFirst({
      where: { id: connectionId, tenantId, customerId, deletedAt: null },
      select: { id: true, servicePlanId: true },
    });
    if (!connection) {
      throw new ForbiddenException('Connection not found on this account');
    }
    return connection;
  }

  private async requireOwn(tenantId: string, customerId: string, id: string) {
    const sr = await this.prisma.serviceRequest.findFirst({
      where: { id, tenantId, customerId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!sr) throw new NotFoundException('Request not found');
    return sr;
  }

  private generateRequestNumber(): string {
    return `SR-${Date.now().toString(36).toUpperCase()}${randomInt(100, 999)}`;
  }
}
