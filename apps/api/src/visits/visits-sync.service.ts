import { Injectable, Inject } from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { CurrentUserContext } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';
import { VisitsService } from './visits.service';
import { OfflineVisitActionDto, SyncVisitsDto } from './dto/sync-visits.dto';
import { VisitState } from './domain/visit-state';

export interface VisitSyncItemResult {
  readonly clientRef: string;
  readonly status: 'APPLIED' | 'DUPLICATE' | 'FAILED';
  readonly error?: string;
}

const ACTION_TO_STATE: Record<OfflineVisitActionDto['action'], VisitState> = {
  ACCEPT: VisitState.ACCEPTED,
  START: VisitState.STARTED,
  PAUSE: VisitState.PAUSED,
  RESUME: VisitState.STARTED,
  COMPLETE: VisitState.COMPLETED,
};

/**
 * Offline visit-action ingestion (3.2 OFFLINE_SYNC.md).
 *
 * Actions are applied in capture order using the device timestamps.
 * Idempotency: each action carries a clientRef persisted on the status
 * history row — a replayed clientRef for the same visit reports DUPLICATE
 * and is never applied twice. Invalid transitions (already applied by an
 * earlier batch, or out-of-order capture) report FAILED with the reason.
 */
@Injectable()
export class VisitsSyncService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly visitsService: VisitsService,
    private readonly auditService: AuditService,
  ) {}

  async syncActions(
    tenantId: string,
    actor: CurrentUserContext,
    dto: SyncVisitsDto,
  ): Promise<{ results: VisitSyncItemResult[] }> {
    const ordered = [...dto.actions].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );

    const results: VisitSyncItemResult[] = [];
    for (const item of ordered) {
      results.push(await this.applyAction(tenantId, actor, item));
    }

    void this.auditService.log({
      tenantId,
      actorId: actor.userId,
      module: 'VISITS',
      entityName: 'visit_sync',
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

  private async applyAction(
    tenantId: string,
    actor: CurrentUserContext,
    item: OfflineVisitActionDto,
  ): Promise<VisitSyncItemResult> {
    const replayed = await this.prisma.visitStatusHistory.findFirst({
      where: { tenantId, visitId: item.visitId, clientRef: item.clientRef },
      select: { id: true },
    });
    if (replayed) {
      return { clientRef: item.clientRef, status: 'DUPLICATE' };
    }

    try {
      await this.visitsService.transition(
        tenantId,
        item.visitId,
        actor,
        ACTION_TO_STATE[item.action],
        {
          notes: item.notes,
          latitude: item.latitude,
          longitude: item.longitude,
          clientRef: item.clientRef,
          at: new Date(item.timestamp),
          assigneeOnly: true,
          ...(item.action === 'COMPLETE' && {
            extraData: { outcome: item.outcome ?? 'COMPLETED_OFFLINE' },
          }),
        },
      );
      return { clientRef: item.clientRef, status: 'APPLIED' };
    } catch (error) {
      return {
        clientRef: item.clientRef,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }
}
