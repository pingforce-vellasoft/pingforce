import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { IPrismaService, CurrentUserContext } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';
import { CreateFaultCommand, UpdateFaultStatusCommand } from './commands/impl';
import { OfflineFaultActionDto, SyncFaultsDto } from './dto/sync-faults.dto';

export interface FaultSyncItemResult {
  readonly clientRef: string;
  readonly status: 'APPLIED' | 'DUPLICATE' | 'FAILED';
  readonly faultId?: string;
  readonly error?: string;
}

/**
 * Offline fault ingestion (3.3 MOBILE_APP.md offline capture; mirrors the
 * attendance/visits sync pattern).
 *
 * Actions apply in capture order through the existing CQRS commands, so
 * SLA computation, validation and notification events all run exactly as
 * they do online. Idempotency: CREATE dedupes on the client-generated
 * faultNumber (unique per tenant); UPDATE_STATUS dedupes on the clientRef
 * persisted to the fault timeline.
 */
@Injectable()
export class FaultsSyncService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly commandBus: CommandBus,
    private readonly auditService: AuditService,
  ) {}

  async syncActions(
    tenantId: string,
    actor: CurrentUserContext,
    dto: SyncFaultsDto,
  ): Promise<{ results: FaultSyncItemResult[] }> {
    const ordered = [...dto.actions].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );

    const results: FaultSyncItemResult[] = [];
    for (const item of ordered) {
      try {
        results.push(
          item.action === 'CREATE'
            ? await this.applyCreate(tenantId, actor, item)
            : await this.applyStatusUpdate(tenantId, actor, item),
        );
      } catch (error) {
        results.push({
          clientRef: item.clientRef,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Sync failed',
        });
      }
    }

    void this.auditService.log({
      tenantId,
      actorId: actor.userId,
      module: 'FAULTS',
      entityName: 'fault_sync',
      entityId: actor.userId,
      action: 'OFFLINE_SYNC',
      newValue: {
        received: dto.actions.length,
        applied: results.filter((r) => r.status === 'APPLIED').length,
        duplicates: results.filter((r) => r.status === 'DUPLICATE').length,
        failed: results.filter((r) => r.status === 'FAILED').length,
      },
    });

    return { results };
  }

  private async applyCreate(
    tenantId: string,
    actor: CurrentUserContext,
    item: OfflineFaultActionDto,
  ): Promise<FaultSyncItemResult> {
    if (!item.faultNumber || !item.title || !item.description) {
      throw new BadRequestException(
        'CREATE requires faultNumber, title and description',
      );
    }

    const existing = await this.prisma.fault.findFirst({
      where: { tenantId, faultNumber: item.faultNumber },
      select: { id: true },
    });
    if (existing) {
      return {
        clientRef: item.clientRef,
        status: 'DUPLICATE',
        faultId: existing.id,
      };
    }

    const fault = await this.commandBus.execute(
      new CreateFaultCommand(tenantId, actor, {
        faultNumber: item.faultNumber,
        title: item.title,
        description: item.description,
        priority: item.priority,
        customerId: item.customerId,
      }),
    );
    return {
      clientRef: item.clientRef,
      status: 'APPLIED',
      faultId: fault.id,
    };
  }

  private async applyStatusUpdate(
    tenantId: string,
    actor: CurrentUserContext,
    item: OfflineFaultActionDto,
  ): Promise<FaultSyncItemResult> {
    if (!item.faultId || !item.status) {
      throw new BadRequestException(
        'UPDATE_STATUS requires faultId and status',
      );
    }

    const replayed = await this.prisma.faultTimeline.findFirst({
      where: { tenantId, faultId: item.faultId, clientRef: item.clientRef },
      select: { id: true },
    });
    if (replayed) {
      return {
        clientRef: item.clientRef,
        status: 'DUPLICATE',
        faultId: item.faultId,
      };
    }

    await this.commandBus.execute(
      new UpdateFaultStatusCommand(tenantId, item.faultId, actor, {
        status: item.status,
        notes: item.notes ?? `Offline status update to ${item.status}`,
        clientRef: item.clientRef,
      }),
    );
    return {
      clientRef: item.clientRef,
      status: 'APPLIED',
      faultId: item.faultId,
    };
  }
}
