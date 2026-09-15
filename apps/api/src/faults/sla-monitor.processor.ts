import { Process, Processor, InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Queue } from 'bull';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { FaultEscalatedEvent, FaultSlaWarningEvent } from './events/impl';
import { SLA_STOPPED_STATES } from './domain/fault-state';
import { AuditService } from '../audit/audit.service';

const SCAN_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const MAX_ESCALATION_LEVEL = 3; // SLA_MANAGEMENT.md §7: Technician → Team Lead → Manager
/** Warn the assignee once the fault is within this window of its deadline. */
const SLA_WARNING_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * SLA breach monitor (3.3_FaultManagement/SLA_MANAGEMENT.md §5-§7,
 * ESCALATION.md): a repeatable BullMQ job scans for faults whose
 * slaDeadline has passed and auto-escalates them one level, publishing
 * FaultEscalatedEvent for notifications and writing the audit trail.
 */
@Injectable()
@Processor('sla-monitor')
export class SlaMonitorProcessor implements OnModuleInit {
  private readonly logger = new Logger(SlaMonitorProcessor.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    @InjectQueue('sla-monitor') private readonly queue: Queue,
    private readonly eventBus: EventBus,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Idempotent: same jobId replaces any previous repeatable registration
    await this.queue.add(
      'scan-breaches',
      {},
      {
        jobId: 'sla-breach-scan',
        repeat: { every: SCAN_INTERVAL_MS },
        removeOnComplete: true,
        removeOnFail: 10,
      },
    );
    this.logger.log(
      `SLA breach scan scheduled every ${SCAN_INTERVAL_MS / 60000} minutes`,
    );
  }

  /**
   * Warns assignees about faults inside the pre-breach window. A
   * `SLA_WARNING` timeline row doubles as the idempotency marker so the
   * five-minute scan notifies each fault only once.
   */
  private async scanWarnings(now: Date): Promise<void> {
    const windowEnd = new Date(now.getTime() + SLA_WARNING_WINDOW_MS);

    const approaching = await this.prisma.fault.findMany({
      where: {
        slaDeadline: { gte: now, lte: windowEnd },
        status: { notIn: [...SLA_STOPPED_STATES] },
        deletedAt: null,
        assignedToId: { not: null },
        faultTimelines: { none: { status: 'SLA_WARNING' } },
      },
      select: {
        id: true,
        tenantId: true,
        faultNumber: true,
        slaDeadline: true,
        assignedToId: true,
      },
      take: 200,
    });

    for (const fault of approaching) {
      if (!fault.slaDeadline) continue;

      await this.prisma.faultTimeline.create({
        data: {
          tenantId: fault.tenantId,
          faultId: fault.id,
          status: 'SLA_WARNING',
          notes: 'Fault is approaching its SLA deadline',
        },
      });

      this.eventBus.publish(
        new FaultSlaWarningEvent(
          fault.tenantId,
          fault.id,
          fault.faultNumber,
          fault.slaDeadline,
          fault.assignedToId ?? undefined,
        ),
      );
    }
  }

  @Process('scan-breaches')
  async scanBreaches(): Promise<void> {
    const now = new Date();

    await this.scanWarnings(now);

    const breached = await this.prisma.fault.findMany({
      where: {
        slaDeadline: { lt: now },
        status: { notIn: [...SLA_STOPPED_STATES] },
        escalationLevel: { lt: MAX_ESCALATION_LEVEL },
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        faultNumber: true,
        escalationLevel: true,
        assignedToId: true,
      },
      take: 200,
    });

    if (breached.length === 0) return;

    this.logger.warn(`SLA scan: ${breached.length} breached fault(s) found`);

    for (const fault of breached) {
      const newLevel = fault.escalationLevel + 1;

      await this.prisma.$transaction([
        this.prisma.fault.update({
          where: {
            id_tenantId: { id: fault.id, tenantId: fault.tenantId },
          },
          data: { isEscalated: true, escalationLevel: newLevel },
        }),
        this.prisma.faultTimeline.create({
          data: {
            tenantId: fault.tenantId,
            faultId: fault.id,
            status: 'AUTO_ESCALATED',
            notes: `SLA breached — auto-escalated to level ${newLevel}`,
          },
        }),
      ]);

      this.eventBus.publish(
        new FaultEscalatedEvent(
          fault.tenantId,
          fault.id,
          fault.assignedToId ?? undefined,
        ),
      );

      void this.auditService.log({
        tenantId: fault.tenantId,
        module: 'FAULTS',
        entityName: 'fault',
        entityId: fault.id,
        action: 'SLA_BREACH_AUTO_ESCALATION',
        severity: 'HIGH',
        newValue: {
          faultNumber: fault.faultNumber,
          escalationLevel: newLevel,
        },
      });
    }
  }
}
