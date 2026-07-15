import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { CurrentUserContext } from '@pingforce-monorepo/shared';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import {
  VisitActionDto,
  AssignVisitDto,
  CompleteVisitDto,
  AddVisitNoteDto,
} from './dto/visit-action.dto';
import {
  VisitState,
  assertTransition,
  resolveState,
  ACTIVE_STATES,
  READ_ONLY_STATES,
} from './domain/visit-state';

export interface VisitListFilters {
  readonly status?: string;
  readonly employeeId?: string;
  readonly customerId?: string;
  readonly from?: string;
  readonly to?: string;
}

interface TransitionOptions {
  readonly notes?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly clientRef?: string;
  readonly at?: Date;
  readonly extraData?: Record<string, unknown>;
  /** When true the acting user must be the assigned employee. */
  readonly assigneeOnly?: boolean;
}

const SAFE_EMPLOYEE_SELECT = {
  select: { id: true, employeeCode: true, firstName: true, lastName: true },
} as const;

/**
 * Visit lifecycle management (3.2_GPSVisitManagement/VISIT_MANAGEMENT.md).
 *
 * Every mutation is tenant-scoped, runs the state machine in
 * domain/visit-state.ts inside a transaction, appends an immutable
 * VisitStatusHistory row, and bumps the optimistic `version` column
 * (DATABASE.md §6 optimistic locking).
 */
@Injectable()
export class VisitsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
  ) {}

  // ---------------------------------------------------------------- queries

  async findAll(
    tenantId: string,
    filters: VisitListFilters,
    cursor?: string,
    take?: number,
  ) {
    const limit = Math.min(take ? Number(take) : 50, 100);
    return this.prisma.visit.findMany({
      where: {
        tenantId,
        ...(filters.status && { status: filters.status }),
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.customerId && { customerId: filters.customerId }),
        ...((filters.from || filters.to) && {
          plannedStartAt: {
            ...(filters.from && { gte: new Date(filters.from) }),
            ...(filters.to && { lte: new Date(filters.to) }),
          },
        }),
      },
      include: {
        customer: { select: { id: true, customerCode: true, legalName: true } },
        employee: SAFE_EMPLOYEE_SELECT,
      },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: [{ plannedStartAt: 'desc' }, { id: 'desc' }],
    });
  }

  /** Visits assigned to the calling user's employee record. */
  async findAssigned(
    tenantId: string,
    userId: string,
    status?: string,
    cursor?: string,
    take?: number,
  ) {
    const employee = await this.resolveEmployee(tenantId, userId);
    return this.findAll(
      tenantId,
      { status, employeeId: employee.id },
      cursor,
      take,
    );
  }

  async findOne(tenantId: string, id: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, customerCode: true, legalName: true } },
        employee: SAFE_EMPLOYEE_SELECT,
        geofence: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        visitNotes: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!visit) throw new NotFoundException(`Visit ${id} not found`);
    return visit;
  }

  // -------------------------------------------------------------- mutations

  async create(
    tenantId: string,
    actor: CurrentUserContext,
    dto: CreateVisitDto,
  ) {
    await this.validateReferences(tenantId, dto);

    const status = dto.employeeId ? VisitState.ASSIGNED : VisitState.PLANNED;

    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.create({
        data: {
          tenantId,
          visitNumber: this.generateVisitNumber(),
          purpose: dto.purpose,
          description: dto.description,
          visitType: dto.visitType ?? 'PLANNED',
          priority: dto.priority ?? 'MEDIUM',
          customerId: dto.customerId,
          employeeId: dto.employeeId,
          geofenceId: dto.geofenceId,
          siteAddress: dto.siteAddress,
          siteLatitude: dto.siteLatitude,
          siteLongitude: dto.siteLongitude,
          plannedStartAt: new Date(dto.plannedStartAt),
          plannedEndAt: dto.plannedEndAt ? new Date(dto.plannedEndAt) : null,
          slaDeadline: dto.slaDeadline ? new Date(dto.slaDeadline) : null,
          status,
          createdBy: actor.userId,
        },
      });
      await tx.visitStatusHistory.create({
        data: {
          tenantId,
          visitId: visit.id,
          fromStatus: null,
          toStatus: status,
          createdBy: actor.userId,
        },
      });
      return visit;
    });
  }

  async update(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: UpdateVisitDto,
  ) {
    const visit = await this.getVisitOrThrow(tenantId, id);
    const state = resolveState(visit.status);
    if (READ_ONLY_STATES.includes(state)) {
      throw new ConflictException(
        `Visit in status ${state} is read-only (reopen it first)`,
      );
    }
    await this.validateReferences(tenantId, dto);

    return this.prisma.visit.update({
      where: { id_tenantId: { id, tenantId } },
      data: {
        ...(dto.purpose !== undefined && { purpose: dto.purpose }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.visitType !== undefined && { visitType: dto.visitType }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId }),
        ...(dto.geofenceId !== undefined && { geofenceId: dto.geofenceId }),
        ...(dto.siteAddress !== undefined && { siteAddress: dto.siteAddress }),
        ...(dto.siteLatitude !== undefined && {
          siteLatitude: dto.siteLatitude,
        }),
        ...(dto.siteLongitude !== undefined && {
          siteLongitude: dto.siteLongitude,
        }),
        ...(dto.plannedStartAt !== undefined && {
          plannedStartAt: new Date(dto.plannedStartAt),
        }),
        ...(dto.plannedEndAt !== undefined && {
          plannedEndAt: new Date(dto.plannedEndAt),
        }),
        ...(dto.slaDeadline !== undefined && {
          slaDeadline: new Date(dto.slaDeadline),
        }),
        updatedBy: actor.userId,
        version: { increment: 1 },
      },
    });
  }

  async remove(tenantId: string, id: string): Promise<{ id: string }> {
    await this.getVisitOrThrow(tenantId, id);
    await this.prisma.visit.delete({
      where: { id_tenantId: { id, tenantId } },
    });
    return { id };
  }

  // ------------------------------------------------------------ transitions

  async assign(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: AssignVisitDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
      select: { id: true },
    });
    if (!employee) {
      throw new BadRequestException(
        'Employee not found or does not belong to this tenant',
      );
    }
    return this.transition(tenantId, id, actor, VisitState.ASSIGNED, {
      notes: dto.notes,
      extraData: { employeeId: dto.employeeId },
    });
  }

  async accept(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.ACCEPTED, {
      ...dto,
      assigneeOnly: true,
    });
  }

  async reject(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.REJECTED, {
      ...dto,
      assigneeOnly: true,
    });
  }

  async start(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.STARTED, {
      ...dto,
      assigneeOnly: true,
    });
  }

  async pause(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.PAUSED, {
      ...dto,
      assigneeOnly: true,
    });
  }

  async resume(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.STARTED, {
      ...dto,
      assigneeOnly: true,
    });
  }

  async complete(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: CompleteVisitDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.COMPLETED, {
      ...dto,
      assigneeOnly: true,
      extraData: { outcome: dto.outcome },
    });
  }

  async cancel(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.CANCELLED, dto);
  }

  async abort(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.ABORTED, {
      ...dto,
      assigneeOnly: true,
    });
  }

  async approve(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.APPROVED, dto);
  }

  async close(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.CLOSED, dto);
  }

  async reopen(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: VisitActionDto,
  ) {
    return this.transition(tenantId, id, actor, VisitState.STARTED, {
      ...dto,
      extraData: { outcome: null, actualEndAt: null },
    });
  }

  // ------------------------------------------------------------------ notes

  async addNote(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    dto: AddVisitNoteDto,
  ) {
    await this.getVisitOrThrow(tenantId, id);
    return this.prisma.visitNote.create({
      data: {
        tenantId,
        visitId: id,
        note: dto.note,
        createdBy: actor.userId,
      },
    });
  }

  async getNotes(tenantId: string, id: string) {
    await this.getVisitOrThrow(tenantId, id);
    return this.prisma.visitNote.findMany({
      where: { tenantId, visitId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ------------------------------------------------------------------ core

  /**
   * Runs one state-machine transition atomically. Used by the controller
   * actions above and by the offline sync service (with `clientRef`).
   */
  async transition(
    tenantId: string,
    id: string,
    actor: CurrentUserContext,
    to: VisitState,
    opts: TransitionOptions = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const visit = await tx.visit.findFirst({ where: { id, tenantId } });
      if (!visit) throw new NotFoundException(`Visit ${id} not found`);

      const from = resolveState(visit.status);
      assertTransition(from, to);

      if (opts.assigneeOnly) {
        const employee = await tx.employee.findFirst({
          where: { userId: actor.userId, tenantId },
          select: { id: true },
        });
        if (!employee || visit.employeeId !== employee.id) {
          throw new ForbiddenException(
            'Only the assigned employee can perform this action',
          );
        }
      }

      const at = opts.at ?? new Date();
      const data: Record<string, unknown> = {
        status: to,
        updatedBy: actor.userId,
        version: { increment: 1 },
        ...(opts.extraData ?? {}),
      };

      // Execution timestamps + GPS capture (VISIT_MANAGEMENT.md §6)
      if (to === VisitState.STARTED && from !== VisitState.PAUSED) {
        // One active visit per employee unless resuming (§7)
        if (visit.employeeId) {
          const active = await tx.visit.findFirst({
            where: {
              tenantId,
              employeeId: visit.employeeId,
              status: { in: [...ACTIVE_STATES] },
              id: { not: id },
            },
            select: { id: true, visitNumber: true },
          });
          if (active) {
            throw new ConflictException(
              `Employee already has an active visit (${active.visitNumber})`,
            );
          }
        }
        data.actualStartAt = visit.actualStartAt ?? at;
        if (opts.latitude !== undefined && opts.longitude !== undefined) {
          data.startLatitude = opts.latitude;
          data.startLongitude = opts.longitude;
          data.gpsValidated = await this.validateGeofence(
            tx,
            tenantId,
            visit.geofenceId,
            opts.latitude,
            opts.longitude,
            visit.employeeId,
          );
        }
      }

      if (to === VisitState.COMPLETED) {
        data.actualEndAt = at;
        if (opts.latitude !== undefined && opts.longitude !== undefined) {
          data.endLatitude = opts.latitude;
          data.endLongitude = opts.longitude;
        }
      }

      const updated = await tx.visit.update({
        where: { id_tenantId: { id, tenantId } },
        data: data as never,
      });

      await tx.visitStatusHistory.create({
        data: {
          tenantId,
          visitId: id,
          fromStatus: from,
          toStatus: to,
          notes: opts.notes,
          latitude: opts.latitude,
          longitude: opts.longitude,
          clientRef: opts.clientRef,
          createdBy: actor.userId,
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------- helpers

  private async getVisitOrThrow(tenantId: string, id: string) {
    const visit = await this.prisma.visit.findFirst({
      where: { id, tenantId },
    });
    if (!visit) throw new NotFoundException(`Visit ${id} not found`);
    return visit;
  }

  private async resolveEmployee(tenantId: string, userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, tenantId },
      select: { id: true },
    });
    if (!employee) {
      throw new ForbiddenException('No employee record linked to this user');
    }
    return employee;
  }

  /** Verifies optional foreign keys belong to the tenant before writing. */
  private async validateReferences(
    tenantId: string,
    dto: Pick<UpdateVisitDto, 'customerId' | 'employeeId' | 'geofenceId'>,
  ): Promise<void> {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
        select: { id: true },
      });
      if (!customer) throw new BadRequestException('Invalid customerId');
    }
    if (dto.employeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, tenantId },
        select: { id: true },
      });
      if (!employee) throw new BadRequestException('Invalid employeeId');
    }
    if (dto.geofenceId) {
      const geofence = await this.prisma.geofence.findFirst({
        where: { id: dto.geofenceId, tenantId },
        select: { id: true },
      });
      if (!geofence) throw new BadRequestException('Invalid geofenceId');
    }
  }

  /**
   * Haversine check of the punch coordinate against the visit's geofence
   * (GEOFENCING.md); falls back to any active tenant geofence when the visit
   * has none. Logs the result to gps_validation_logs.
   */
  private async validateGeofence(
    tx: Pick<ExtendedPrismaClient, '$queryRaw' | 'gpsValidationLog'>,
    tenantId: string,
    geofenceId: string | null,
    latitude: number,
    longitude: number,
    employeeId: string | null,
  ): Promise<boolean> {
    const rows = geofenceId
      ? await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "geofences"
          WHERE "id" = ${geofenceId} AND "tenantId" = ${tenantId} AND "active" = true
          AND (6371000 * acos(
            cos(radians(${latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          )) <= "radiusMeters"
          LIMIT 1;
        `
      : await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "geofences"
          WHERE "tenantId" = ${tenantId} AND "active" = true
          AND (6371000 * acos(
            cos(radians(${latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          )) <= "radiusMeters"
          LIMIT 1;
        `;

    const valid = rows.length > 0;
    if (employeeId) {
      await tx.gpsValidationLog.create({
        data: {
          tenantId,
          employeeId,
          latitude,
          longitude,
          result: valid ? 'VALID' : 'OUTSIDE_GEOFENCE',
        },
      });
    }
    return valid;
  }

  private generateVisitNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `V-${ts}-${rand}`;
  }
}
