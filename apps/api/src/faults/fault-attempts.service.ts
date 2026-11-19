import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { FaultAccessService } from './fault-access.service';
import { FaultState } from './domain/fault-state';
import { CreateFaultAttemptDto } from './dto/create-fault-attempt.dto';

/** Faults that are finished take no more field attempts. */
const CLOSED_FOR_ATTEMPTS: readonly string[] = [
  FaultState.RESOLVED,
  FaultState.CLOSED,
];

/** Concurrent submits on one fault race for the next attemptNumber. */
const MAX_NUMBER_RETRIES = 3;

const TECHNICIAN_SELECT = {
  select: {
    id: true,
    profile: { select: { firstName: true, lastName: true } },
  },
} as const;

export type FaultAttemptView = Prisma.FaultAttemptGetPayload<{
  include: { technician: typeof TECHNICIAN_SELECT };
}>;

function isUniqueViolation(error: unknown, field: string): boolean {
  if (
    typeof error !== 'object' ||
    error === null ||
    (error as { code?: unknown }).code !== 'P2002'
  ) {
    return false;
  }
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  return Array.isArray(target)
    ? target.includes(field)
    : String(target ?? '').includes(field);
}

/**
 * Field attempts on a fault (3.3 ATTEMPT_MANAGEMENT.md). Attempts are
 * immutable once recorded: there is no update or delete path. Recording an
 * attempt does not change the fault status; the technician still moves the
 * fault with PATCH /faults/:id/status, so the state machine stays in one place.
 */
@Injectable()
export class FaultAttemptsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly faultAccess: FaultAccessService,
  ) {}

  async list(
    tenantId: string,
    faultId: string,
    userId: string,
  ): Promise<FaultAttemptView[]> {
    const scopeWhere = await this.faultAccess.scopeForAction(tenantId, userId, [
      'READ',
      'READ_OWN',
    ]);
    await this.findFaultOr404(tenantId, faultId, scopeWhere);
    return this.prisma.faultAttempt.findMany({
      where: { tenantId, faultId, deletedAt: null },
      include: { technician: TECHNICIAN_SELECT },
      orderBy: { attemptNumber: 'asc' },
    });
  }

  async create(
    tenantId: string,
    faultId: string,
    userId: string,
    dto: CreateFaultAttemptDto,
  ): Promise<FaultAttemptView> {
    const scopeWhere = await this.faultAccess.scopeForAction(
      tenantId,
      userId,
      'UPDATE',
    );
    const fault = await this.findFaultOr404(tenantId, faultId, scopeWhere);

    if (dto.clientRef) {
      const replay = await this.prisma.faultAttempt.findFirst({
        where: { tenantId, faultId, clientRef: dto.clientRef },
        include: { technician: TECHNICIAN_SELECT },
      });
      if (replay) return replay;
    }

    if (CLOSED_FOR_ATTEMPTS.includes(fault.status)) {
      throw new BadRequestException(
        `Fault is ${fault.status}; reopen it before recording another attempt`,
      );
    }

    const startedAt = new Date(dto.startedAt);
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
    if (endedAt && endedAt < startedAt) {
      throw new BadRequestException('endedAt must not be before startedAt');
    }
    if (startedAt.getTime() > Date.now() + 5 * 60_000) {
      throw new BadRequestException('startedAt cannot be in the future');
    }
    const workNotes = dto.workNotes?.trim() || null;
    if (dto.outcome === 'RESOLVED' && !workNotes) {
      throw new BadRequestException(
        'workNotes are required when the outcome is RESOLVED',
      );
    }
    if ((dto.latitude === undefined) !== (dto.longitude === undefined)) {
      throw new BadRequestException(
        'latitude and longitude must be sent together',
      );
    }

    const durationMinutes = endedAt
      ? Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000)
      : null;

    for (let retry = 0; ; retry++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const last = await tx.faultAttempt.findFirst({
            where: { faultId },
            orderBy: { attemptNumber: 'desc' },
            select: { attemptNumber: true },
          });
          const attemptNumber = (last?.attemptNumber ?? 0) + 1;

          const attempt = await tx.faultAttempt.create({
            data: {
              tenantId,
              faultId,
              attemptNumber,
              attemptType: dto.attemptType,
              outcome: dto.outcome,
              technicianId: userId,
              startedAt,
              endedAt,
              durationMinutes,
              latitude: dto.latitude ?? null,
              longitude: dto.longitude ?? null,
              workNotes,
              nextAction: dto.nextAction?.trim() || null,
              clientRef: dto.clientRef ?? null,
              createdBy: userId,
              updatedBy: userId,
            },
            include: { technician: TECHNICIAN_SELECT },
          });

          // Internal timeline entry so the fault history shows the attempt.
          await tx.faultTimeline.create({
            data: {
              tenantId,
              faultId,
              status: fault.status,
              notes: `Attempt #${attemptNumber} (${dto.attemptType}): ${dto.outcome}`,
              isCustomerVisible: false,
              createdBy: userId,
            },
          });
          return attempt;
        });
      } catch (error) {
        if (dto.clientRef && isUniqueViolation(error, 'clientRef')) {
          // A concurrent retry of the same submit won; return its row.
          const replay = await this.prisma.faultAttempt.findFirst({
            where: { tenantId, faultId, clientRef: dto.clientRef },
            include: { technician: TECHNICIAN_SELECT },
          });
          if (replay) return replay;
        }
        if (isUniqueViolation(error, 'attemptNumber')) {
          if (retry < MAX_NUMBER_RETRIES) continue;
          throw new ConflictException(
            'Another attempt was being recorded on this fault; retry',
          );
        }
        throw error;
      }
    }
  }

  private async findFaultOr404(
    tenantId: string,
    faultId: string,
    scopeWhere: Record<string, unknown>,
  ): Promise<{ id: string; status: string }> {
    const fault = await this.prisma.fault.findFirst({
      where: { ...scopeWhere, id: faultId, tenantId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!fault)
      throw new NotFoundException(`Fault with ID ${faultId} not found`);
    return fault;
  }
}
