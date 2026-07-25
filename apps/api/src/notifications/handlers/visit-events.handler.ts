import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { IPrismaService } from '@pingforce-monorepo/shared';
import {
  VisitAssignedEvent,
  VisitStatusChangedEvent,
} from '../../visits/events/impl';
import { NotificationsService } from '../notifications.service';

/**
 * Visit notification routing (3.2 VISIT_MANAGEMENT.md §9, 3.6 EVENT_CATALOG).
 * Templates (per-tenant NotificationTemplate rows): VISIT_ASSIGNED,
 * VISIT_COMPLETED, VISIT_REJECTED — missing/inactive templates are logged
 * and skipped by NotificationsService.
 */
@EventsHandler(VisitAssignedEvent)
export class VisitAssignedHandler implements IEventHandler<VisitAssignedEvent> {
  private readonly logger = new Logger(VisitAssignedHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  async handle(event: VisitAssignedEvent) {
    this.logger.log(
      `VisitAssignedEvent for visit ${event.visitNumber} → employee ${event.employeeId}`,
    );
    // Recipient is the assigned employee's linked user account
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: event.employeeId,
        tenantId: event.tenantId,
        deletedAt: null,
      },
      select: { userId: true },
    });
    if (!employee?.userId) return;

    await this.notificationsService.sendEmail(
      event.tenantId,
      employee.userId,
      'VISIT_ASSIGNED',
      { visitNumber: event.visitNumber, purpose: event.purpose },
    );
  }
}

@EventsHandler(VisitStatusChangedEvent)
export class VisitStatusChangedHandler
  implements IEventHandler<VisitStatusChangedEvent>
{
  private readonly logger = new Logger(VisitStatusChangedHandler.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async handle(event: VisitStatusChangedEvent) {
    this.logger.log(
      `VisitStatusChangedEvent for visit ${event.visitNumber}: ${event.newStatus}`,
    );
    // Planner/creator is notified when execution finishes or is refused
    if (!event.createdBy) return;

    if (event.newStatus === 'COMPLETED') {
      await this.notificationsService.sendEmail(
        event.tenantId,
        event.createdBy,
        'VISIT_COMPLETED',
        { visitNumber: event.visitNumber, status: event.newStatus },
      );
    } else if (event.newStatus === 'REJECTED') {
      await this.notificationsService.sendEmail(
        event.tenantId,
        event.createdBy,
        'VISIT_REJECTED',
        { visitNumber: event.visitNumber, status: event.newStatus },
      );
    }
  }
}

export const VisitEventsHandler = [
  VisitAssignedHandler,
  VisitStatusChangedHandler,
];
