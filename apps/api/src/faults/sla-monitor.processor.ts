import { Process, Processor, InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Queue } from 'bull';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { FaultEscalatedEvent } from './events/impl';
import { AuditService } from '../audit/audit.service';

const SCAN_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const MAX_ESCALATION_LEVEL = 3; // SLA_MANAGEMENT.md §7: Technician → Team Lead → Manager

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

  @Process('scan-breaches')
  async scanBreaches(): Promise<void> {
    const now = new Date();

    const breached = await this.prisma.fault.findMany({
      where: {
        slaDeadline: { lt: now },
        status: { notIn: ['RESOLVED', 'CLOSED'] },
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
          where: { id: fault.id },
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
