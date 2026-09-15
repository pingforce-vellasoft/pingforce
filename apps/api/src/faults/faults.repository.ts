import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaRepository, IPrismaService } from '@pingforce-monorepo/shared';
import {
  FaultState,
  SLA_STOPPED_STATES,
  assertTransition,
  resolveState,
} from './domain/fault-state';
import { CreateFaultDto } from './dto/create-fault.dto';
import { FaultListQueryDto } from './dto/fault-list-query.dto';
import { UpdateFaultDto } from './dto/update-fault.dto';
import { Fault, FaultTimeline, Prisma } from '@prisma/client';

// Safe projection for User relations — never expose passwordHash/tokenVersion
const SAFE_USER_SELECT = {
  select: {
    id: true,
    email: true,
    phone: true,
    status: true,
    profile: { select: { firstName: true, lastName: true } },
  },
} as const;

export interface PaginatedFaults {
  readonly items: FaultListItem[];
  readonly total: number;
}

export type FaultListItem = Prisma.FaultGetPayload<{
  include: { customer: true; assignedToUser: typeof SAFE_USER_SELECT };
}>;

export type AssignedFault = Prisma.FaultGetPayload<{
  include: { customer: true };
}>;

export type FaultDetail = Prisma.FaultGetPayload<{
  include: {
    customer: true;
    assignedToUser: typeof SAFE_USER_SELECT;
    faultTimelines: true;
  };
}>;

export type BreachedFault = Prisma.FaultGetPayload<{
  include: { assignedToUser: typeof SAFE_USER_SELECT };
}>;

@Injectable()
export class FaultsRepository extends PrismaRepository<
  Fault,
  Prisma.FaultUncheckedCreateInput,
  Prisma.FaultUncheckedUpdateInput,
  Prisma.FaultDelegate
> {
  constructor(
    @Inject('IPrismaService') private readonly prismaService: IPrismaService,
  ) {
    super(prismaService.fault);
  }

  /** Translates the list-query DTO into a Prisma `where` fragment. */
  private buildFilterWhere(
    query: FaultListQueryDto = {},
  ): Prisma.FaultWhereInput {
    const where: Prisma.FaultWhereInput = {};

    if (query.status?.length) where['status'] = { in: query.status };
    if (query.priority?.length) where['priority'] = { in: query.priority };
    if (query.assignedToId) where['assignedToId'] = query.assignedToId;
    if (query.customerId) where['customerId'] = query.customerId;
    if (query.category) where['category'] = query.category;
    if (query.channel) where['channel'] = query.channel;
    if (query.unassigned) where['assignedToId'] = null;

    if (query.slaBreached) {
      where['slaDeadline'] = { lt: new Date() };
      where['status'] = { notIn: [...SLA_STOPPED_STATES] };
    }

    if (query.dateFrom || query.dateTo) {
      where['createdAt'] = {
        ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
        ...(query.dateTo && { lte: new Date(query.dateTo) }),
      };
    }

    if (query.q) {
      where['OR'] = [
        { faultNumber: { contains: query.q, mode: 'insensitive' } },
        { title: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Filtered, paginated fault list. Returns the row window plus the total
   * matching count so the admin grid can page server-side.
   */
  async findAllPaginated(
    tenantId: string,
    query: FaultListQueryDto = {},
    scopeWhere: Record<string, unknown> = {},
  ): Promise<PaginatedFaults> {
    const where = {
      tenantId,
      deletedAt: null,
      ...this.buildFilterWhere(query),
      ...scopeWhere,
    };
    const orderBy = {
      [query.sortBy ?? 'createdAt']: query.sortDir ?? 'desc',
    };

    const [items, total] = await this.prismaService.$transaction([
      this.delegate.findMany({
        where,
        include: { customer: true, assignedToUser: SAFE_USER_SELECT },
        orderBy,
        skip: query.skip,
        take: query.take ?? 25,
      }),
      this.delegate.count({ where }),
    ]);

    return { items, total };
  }

  override async findAll(
    tenantId: string,
    skip?: number,
    take?: number,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<FaultListItem[]> {
    return this.delegate.findMany({
      where: { tenantId, deletedAt: null, ...scopeWhere },
      include: {
        customer: true,
        assignedToUser: SAFE_USER_SELECT,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async findAssignedToMe(
    tenantId: string,
    userId: string,
    skip?: number,
    take?: number,
  ): Promise<AssignedFault[]> {
    return this.delegate.findMany({
      where: { tenantId, deletedAt: null, assignedToId: userId },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: take ?? 25,
    });
  }

  override async findById(
    tenantId: string,
    id: string,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<FaultDetail | null> {
    const fault = await this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null, ...scopeWhere },
      include: {
        customer: true,
        assignedToUser: SAFE_USER_SELECT,
        faultTimelines: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return fault || null;
  }

  async findBreached(
    tenantId: string,
    skip?: number,
    take?: number,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<BreachedFault[]> {
    return this.delegate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...scopeWhere,
        slaDeadline: { lt: new Date() },
        status: { notIn: [...SLA_STOPPED_STATES] },
      },
      include: {
        assignedToUser: SAFE_USER_SELECT,
      },
      orderBy: {
        slaDeadline: 'asc',
      },
      skip,
      take: take ?? 25,
    });
  }

  async createFaultWithTimeline(
    tenantId: string,
    userId: string,
    data: Omit<CreateFaultDto, 'assignToSelf'>,
    slaDeadline: Date | null,
  ): Promise<Fault> {
    return this.prismaService.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const fault = await tx.fault.create({
          data: {
            tenantId,
            createdBy: userId,
            slaDeadline,
            ...data,
            status: data.assignedToId ? FaultState.ASSIGNED : FaultState.OPEN,
          },
        });

        await tx.faultTimeline.create({
          data: {
            tenantId,
            faultId: fault.id,
            status: fault.status,
            notes: 'Fault created',
            createdBy: userId,
          },
        });
        return fault;
      },
    );
  }

  async updateFault(
    tenantId: string,
    id: string,
    userId: string,
    data: UpdateFaultDto,
    slaDeadline: Date | undefined,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<Fault> {
    return this.prismaService.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const existing = await tx.fault.findFirst({
          where: { ...scopeWhere, id, tenantId, deletedAt: null },
        });
        if (!existing)
          throw new NotFoundException(`Fault with ID ${id} not found`);
        if (existing.status === FaultState.CLOSED) {
          throw new BadRequestException('Closed faults are read-only');
        }

        return tx.fault.update({
          where: {
            ...scopeWhere,
            id_tenantId: { id, tenantId },
            deletedAt: null,
          },
          data: {
            ...data,
            ...(slaDeadline !== undefined && { slaDeadline }),
            updatedBy: userId,
          },
        });
      },
    );
  }

  /**
   * Applies a state-machine-validated status change, stamping the lifecycle
   * timestamps and accumulating SLA pause time across ON_HOLD stretches.
   */
  async updateStatus(
    tenantId: string,
    id: string,
    userId: string,
    status: string,
    notes: string,
    clientRef?: string,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<Fault> {
    return this.prismaService.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const fault = await tx.fault.findFirst({
          where: { ...scopeWhere, id, tenantId, deletedAt: null },
        });
        if (!fault)
          throw new NotFoundException(`Fault with ID ${id} not found`);

        const from = resolveState(fault.status);
        const to = resolveState(status);
        assertTransition(from, to);
        if (to === FaultState.OPEN) {
          throw new BadRequestException(
            'Use the assignment endpoint to return a fault to the queue',
          );
        }
        if (
          (to === FaultState.ASSIGNED || to === FaultState.IN_PROGRESS) &&
          !fault.assignedToId
        ) {
          throw new BadRequestException(
            `Assign a technician before moving the fault to ${to}`,
          );
        }

        const now = new Date();
        const data: Record<string, unknown> = { status: to, updatedBy: userId };

        // SLA clock: pause on entering ON_HOLD, bank the elapsed minutes on exit.
        if (to === FaultState.ON_HOLD) {
          data['slaPausedAt'] = now;
        } else if (from === FaultState.ON_HOLD && fault.slaPausedAt) {
          const pausedMinutes = Math.max(
            0,
            Math.round((now.getTime() - fault.slaPausedAt.getTime()) / 60000),
          );
          data['slaPausedAt'] = null;
          data['slaPausedMinutes'] =
            (fault.slaPausedMinutes ?? 0) + pausedMinutes;
          // Push the deadline out by the paused span so the hold does not burn SLA.
          if (fault.slaDeadline) {
            data['slaDeadline'] = new Date(
              fault.slaDeadline.getTime() + pausedMinutes * 60000,
            );
          }
        }

        if (to === FaultState.RESOLVED) data['resolvedAt'] = now;
        if (to === FaultState.CLOSED) data['closedAt'] = now;
        if (to === FaultState.REOPENED) {
          data['reopenCount'] = { increment: 1 };
          data['resolvedAt'] = null;
        }

        const claimed = await tx.fault.updateMany({
          where: {
            ...scopeWhere,
            id,
            tenantId,
            deletedAt: null,
            status: fault.status,
          },
          data,
        });
        if (claimed.count !== 1) {
          throw new ConflictException(
            'Fault status changed in another request; reload and try again',
          );
        }

        const updatedFault = await tx.fault.findUnique({
          where: { id_tenantId: { id, tenantId } },
        });
        if (!updatedFault) {
          throw new NotFoundException(`Fault with ID ${id} not found`);
        }

        await tx.faultTimeline.create({
          data: {
            tenantId,
            faultId: updatedFault.id,
            status: to,
            notes,
            clientRef,
            createdBy: userId,
          },
        });

        return updatedFault;
      },
    );
  }

  /**
   * Assigns (or unassigns) a fault. An OPEN fault moves to ASSIGNED; faults
   * already in flight keep their status so work in progress is not reset.
   */
  async assignFault(
    tenantId: string,
    id: string,
    userId: string,
    assignedToId: string | null,
    notes?: string,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<Fault> {
    return this.prismaService.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const fault = await tx.fault.findFirst({
          where: { ...scopeWhere, id, tenantId, deletedAt: null },
        });
        if (!fault)
          throw new NotFoundException(`Fault with ID ${id} not found`);

        const from = resolveState(fault.status);
        if (from === FaultState.CLOSED)
          throw new BadRequestException('Cannot assign a closed fault');
        if (from === FaultState.RESOLVED) {
          throw new BadRequestException(
            'Reopen the fault before changing its assignment',
          );
        }
        if (
          !assignedToId &&
          from !== FaultState.OPEN &&
          from !== FaultState.ASSIGNED
        ) {
          throw new BadRequestException(
            'Reassign in-flight work to another technician instead of unassigning it',
          );
        }

        const to = !assignedToId
          ? FaultState.OPEN
          : from === FaultState.OPEN
            ? FaultState.ASSIGNED
            : from;
        if (to !== from) assertTransition(from, to);

        const updated = await tx.fault.update({
          where: {
            ...scopeWhere,
            id_tenantId: { id, tenantId },
            deletedAt: null,
            status: fault.status,
          },
          data: { assignedToId, status: to, updatedBy: userId },
        });

        await tx.faultTimeline.create({
          data: {
            tenantId,
            faultId: updated.id,
            status: to,
            notes:
              notes ??
              (assignedToId ? 'Fault assigned' : 'Fault returned to the queue'),
            createdBy: userId,
          },
        });

        return updated;
      },
    );
  }

  /**
   * Adds a staff note to the timeline without changing the fault's status.
   *
   * Notes are internal unless explicitly published: the customer view filters
   * on `isCustomerVisible`, so this flag is the only thing standing between a
   * working note and the subscriber reading it.
   */
  async addNote(
    tenantId: string,
    id: string,
    userId: string,
    notes: string,
    isCustomerVisible: boolean,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<FaultTimeline> {
    const fault = await this.delegate.findFirst({
      where: { ...scopeWhere, id, tenantId, deletedAt: null },
    });
    if (!fault) throw new NotFoundException(`Fault with ID ${id} not found`);

    return this.prismaService.faultTimeline.create({
      data: {
        tenantId,
        faultId: id,
        status: fault.status,
        notes,
        isCustomerVisible,
        createdBy: userId,
      },
    });
  }

  /**
   * Publishes or retracts a single timeline entry for the customer. Scoped by
   * tenant AND fault so an entry id from another tenant cannot be flipped.
   */
  async setTimelineVisibility(
    tenantId: string,
    faultId: string,
    entryId: string,
    isCustomerVisible: boolean,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<FaultTimeline> {
    const fault = await this.delegate.findFirst({
      where: { ...scopeWhere, id: faultId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!fault) throw new NotFoundException('Fault not found');
    const entry = await this.prismaService.faultTimeline.findFirst({
      where: { id: entryId, tenantId, faultId },
    });
    if (!entry) throw new NotFoundException('Timeline entry not found');

    return this.prismaService.faultTimeline.update({
      where: { id_tenantId: { id: entryId, tenantId } },
      data: { isCustomerVisible },
    });
  }

  /**
   * Soft-deletes the fault. Business records are never hard-deleted, so the
   * hard-deleting base implementation is deliberately overridden here.
   */
  override async delete(
    tenantId: string,
    id: string,
    scopeWhere: Record<string, unknown> = {},
    userId?: string,
  ): Promise<Fault> {
    const fault = await this.delegate.findFirst({
      where: { ...scopeWhere, id, tenantId, deletedAt: null },
    });
    if (!fault) throw new NotFoundException(`Fault with ID ${id} not found`);

    return this.delegate.update({
      where: { ...scopeWhere, id_tenantId: { id, tenantId }, deletedAt: null },
      data: { deletedAt: new Date(), ...(userId && { updatedBy: userId }) },
    });
  }

  async escalateFault(
    tenantId: string,
    id: string,
    userId: string,
    escalateToId?: string,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<Fault> {
    return this.prismaService.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const fault = await tx.fault.findFirst({
          where: { ...scopeWhere, id, tenantId, deletedAt: null },
        });
        if (!fault)
          throw new NotFoundException(`Fault with ID ${id} not found`);
        if (
          fault.status === FaultState.CLOSED ||
          fault.status === FaultState.RESOLVED
        ) {
          throw new BadRequestException(
            'Cannot escalate a resolved or closed fault',
          );
        }

        const escalatedFault = await tx.fault.update({
          where: {
            ...scopeWhere,
            id_tenantId: { id, tenantId },
            deletedAt: null,
            status: fault.status,
          },
          data: {
            escalationLevel: { increment: 1 },
            isEscalated: true,
            ...(escalateToId && { assignedToId: escalateToId }),
            updatedBy: userId,
          },
        });

        await tx.faultTimeline.create({
          data: {
            tenantId,
            faultId: escalatedFault.id,
            status: escalatedFault.status,
            notes: `Fault escalated to level ${escalatedFault.escalationLevel}`,
            createdBy: userId,
          },
        });

        return escalatedFault;
      },
    );
  }
}
