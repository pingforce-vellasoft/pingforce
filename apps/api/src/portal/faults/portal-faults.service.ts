import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { randomInt } from 'crypto';
import {
  IPrismaService,
  SlaComputationService,
} from '@pingforce-monorepo/shared';
import { AuditService } from '../../audit/audit.service';
import {
  PortalCreateFaultDto,
  PortalFaultCommentDto,
  PortalFaultListQueryDto,
  PortalFaultRatingDto,
} from './portal-faults.dto';
import { ACTIVE_STATES, FaultState } from '../../faults/domain/fault-state';
import {
  FaultCommentedEvent,
  FaultReopenedEvent,
} from '../../faults/events/impl';

const MAX_OPEN_FAULTS_PER_CUSTOMER = 10;

// Customer-safe projection (BR-9.5): assigned technician first name only,
// no staff emails/ids, no internal fields.
const PORTAL_FAULT_SELECT = {
  id: true,
  faultNumber: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  slaDeadline: true,
  customerRating: true,
  createdAt: true,
  updatedAt: true,
  assignedToUser: {
    select: { profile: { select: { firstName: true } } },
  },
} as const;

/**
 * Customer-facing fault register (3.8_CustomerPortal BR-3). Portal-raised
 * faults enter the existing 3.3 fault engine unchanged — same table, SLA
 * clocks, escalation and staff workflows apply; channel is recorded as
 * PORTAL. All access is scoped tenantId + customerId from the JWT.
 */
@Injectable()
export class PortalFaultsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly slaComputationService: SlaComputationService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBus,
  ) {}

  async create(
    tenantId: string,
    customerId: string,
    portalUserId: string,
    dto: PortalCreateFaultDto,
  ) {
    // Duplicate/abuse guard (BR-3.8): cap open portal faults per account
    const openCount = await this.prisma.fault.count({
      where: {
        tenantId,
        customerId,
        deletedAt: null,
        status: { in: [...ACTIVE_STATES] },
      },
    });
    if (openCount >= MAX_OPEN_FAULTS_PER_CUSTOMER) {
      throw new BadRequestException(
        'Too many open complaints on this account. Please wait for existing ones to be resolved.',
      );
    }

    if (dto.connectionId) {
      const connection = await this.prisma.networkConnection.findFirst({
        where: { id: dto.connectionId, tenantId, customerId, deletedAt: null },
      });
      if (!connection) {
        throw new BadRequestException('Connection not found on this account');
      }
    }

    const priority = 'MEDIUM';
    const slaPolicy = await this.prisma.slaPolicy.findFirst({
      where: { tenantId, priority, deletedAt: null },
    });
    const slaDeadline = slaPolicy
      ? this.slaComputationService.calculateSlaDeadline(
          slaPolicy.resolveInHours,
        )
      : null;

    const fault = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fault.create({
        data: {
          tenantId,
          faultNumber: this.generateFaultNumber(),
          customerId,
          title: dto.title,
          description: dto.description,
          connectionId: dto.connectionId ?? null,
          priority,
          slaDeadline,
          channel: 'PORTAL',
          reportedByPortalUserId: portalUserId,
          createdBy: portalUserId,
        },
        select: PORTAL_FAULT_SELECT,
      });
      await tx.faultTimeline.create({
        data: {
          tenantId,
          faultId: created.id,
          status: 'OPEN',
          notes: 'Complaint registered via customer portal',
          isCustomerVisible: true,
          createdBy: portalUserId,
        },
      });
      return created;
    });

    void this.auditService.log({
      tenantId,
      actorId: portalUserId,
      module: 'PORTAL_FAULTS',
      entityName: 'fault',
      entityId: fault.id,
      action: 'PORTAL_FAULT_CREATED',
      newValue: { faultNumber: fault.faultNumber, customerId },
    });

    return this.toPortalView(fault);
  }

  async list(
    tenantId: string,
    customerId: string,
    query: PortalFaultListQueryDto,
  ) {
    const faults = await this.prisma.fault.findMany({
      where: {
        tenantId,
        customerId,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
      },
      select: PORTAL_FAULT_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: query.skip ?? 0,
      take: query.take ?? 20,
    });
    return faults.map((f) => this.toPortalView(f));
  }

  async findOne(tenantId: string, customerId: string, faultId: string) {
    const fault = await this.prisma.fault.findFirst({
      where: { id: faultId, tenantId, customerId, deletedAt: null },
      select: {
        ...PORTAL_FAULT_SELECT,
        faultTimelines: {
          where: { isCustomerVisible: true },
          select: { status: true, notes: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!fault) throw new NotFoundException('Complaint not found');

    // Only attachments explicitly flagged for the customer are exposed;
    // internal evidence photos stay staff-only (BR-3.4).
    const attachments = await this.prisma.fileAttachment.findMany({
      where: {
        tenantId,
        entityType: 'FAULT',
        entityId: faultId,
        isCustomerVisible: true,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        fileUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const { faultTimelines, ...rest } = fault;
    return {
      ...this.toPortalView(rest),
      timeline: faultTimelines,
      attachments,
    };
  }

  async comment(
    tenantId: string,
    customerId: string,
    portalUserId: string,
    faultId: string,
    dto: PortalFaultCommentDto,
  ) {
    const fault = await this.requireFault(tenantId, customerId, faultId);
    if (['CLOSED'].includes(fault.status)) {
      throw new BadRequestException(
        'This complaint is closed. Please raise a new one.',
      );
    }

    await this.prisma.faultTimeline.create({
      data: {
        tenantId,
        faultId: fault.id,
        status: fault.status,
        notes: `[Customer] ${dto.notes}`,
        isCustomerVisible: true,
        createdBy: portalUserId,
      },
    });

    // Tell the assignee: a customer reply that nobody is notified about is
    // indistinguishable from silence, and the SLA keeps running.
    this.eventBus.publish(
      new FaultCommentedEvent(
        tenantId,
        fault.id,
        fault.faultNumber,
        fault.assignedToId ?? undefined,
      ),
    );

    return { message: 'Comment added' };
  }

  /** Reopen within the tenant-configured window (BR-3.6). */
  async reopen(
    tenantId: string,
    customerId: string,
    portalUserId: string,
    faultId: string,
    dto: PortalFaultCommentDto,
  ) {
    const fault = await this.requireFault(tenantId, customerId, faultId);
    if (fault.status !== 'RESOLVED') {
      throw new BadRequestException('Only resolved complaints can be reopened');
    }

    const settings = await this.prisma.tenantSetting.findUnique({
      where: { tenantId },
      select: { portalFaultReopenHours: true },
    });
    const windowHours = settings?.portalFaultReopenHours ?? 72;
    const windowMs = windowHours * 60 * 60 * 1000;
    // Measured from resolution, not `updatedAt` — any later edit to the fault
    // would otherwise silently extend the customer's reopen window.
    const resolvedAt = fault.resolvedAt ?? fault.updatedAt;
    if (Date.now() - resolvedAt.getTime() > windowMs) {
      throw new BadRequestException(
        `The reopen window (${windowHours}h) has passed. Please raise a new complaint.`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.fault.updateMany({
        where: {
          id: fault.id,
          tenantId,
          customerId,
          deletedAt: null,
          status: FaultState.RESOLVED,
        },
        data: {
          status: FaultState.REOPENED,
          resolvedAt: null,
          reopenCount: { increment: 1 },
          updatedBy: portalUserId,
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'Complaint status changed; refresh before reopening',
        );
      }
      await tx.faultTimeline.create({
        data: {
          tenantId,
          faultId: fault.id,
          status: FaultState.REOPENED,
          notes: `[Customer reopened] ${dto.notes}`,
          isCustomerVisible: true,
          createdBy: portalUserId,
        },
      });
      const reopened = await tx.fault.findFirst({
        where: { id: fault.id, tenantId, customerId, deletedAt: null },
        select: PORTAL_FAULT_SELECT,
      });
      if (!reopened) throw new NotFoundException('Complaint not found');
      return reopened;
    });

    // A reopened fault is live work again — the assignee has to be told, or it
    // sits in REOPENED with nobody aware it came back.
    this.eventBus.publish(
      new FaultReopenedEvent(
        tenantId,
        fault.id,
        fault.faultNumber,
        fault.assignedToId ?? undefined,
      ),
    );

    void this.auditService.log({
      tenantId,
      actorId: portalUserId,
      module: 'PORTAL_FAULTS',
      entityName: 'fault',
      entityId: fault.id,
      action: 'PORTAL_FAULT_REOPENED',
    });

    return this.toPortalView(updated);
  }

  /** One-time closure rating (BR-3.7). */
  async rate(
    tenantId: string,
    customerId: string,
    portalUserId: string,
    faultId: string,
    dto: PortalFaultRatingDto,
  ) {
    const fault = await this.requireFault(tenantId, customerId, faultId);
    if (!['RESOLVED', 'CLOSED'].includes(fault.status)) {
      throw new BadRequestException(
        'Only resolved or closed complaints can be rated',
      );
    }
    if (fault.customerRating !== null) {
      throw new BadRequestException('This complaint has already been rated');
    }

    const rated = await this.prisma.fault.updateMany({
      where: {
        id: fault.id,
        tenantId,
        customerId,
        deletedAt: null,
        customerRating: null,
        status: { in: [FaultState.RESOLVED, FaultState.CLOSED] },
      },
      data: {
        customerRating: dto.rating,
        customerRatingComment: dto.comment,
        updatedBy: portalUserId,
      },
    });
    if (rated.count !== 1) {
      throw new ConflictException(
        'Complaint status or rating changed; refresh and try again',
      );
    }
    return { message: 'Thank you for your feedback' };
  }

  private async requireFault(
    tenantId: string,
    customerId: string,
    faultId: string,
  ) {
    const fault = await this.prisma.fault.findFirst({
      where: { id: faultId, tenantId, customerId, deletedAt: null },
    });
    if (!fault) throw new NotFoundException('Complaint not found');
    return fault;
  }

  private generateFaultNumber(): string {
    // Server-generated, time-sortable, collision-safe under the per-tenant
    // unique constraint: PF-<epoch36>-<3 random digits>
    return `PF-${Date.now().toString(36).toUpperCase()}${randomInt(100, 999)}`;
  }

  private toPortalView(fault: {
    assignedToUser?: { profile: { firstName: string } | null } | null;
    [key: string]: unknown;
  }) {
    const { assignedToUser, ...rest } = fault;
    return {
      ...rest,
      technicianFirstName: assignedToUser?.profile?.firstName ?? null,
    };
  }
}
