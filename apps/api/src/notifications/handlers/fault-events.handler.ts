import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  FaultAssignedEvent,
  FaultCommentedEvent,
  FaultCreatedEvent,
  FaultEscalatedEvent,
  FaultReopenedEvent,
  FaultSlaWarningEvent,
  FaultStatusUpdatedEvent,
} from '../../faults/events/impl';
import { NotificationsService } from '../notifications.service';
import { InAppNotificationService } from '../in-app-notification.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

/**
 * Resolves the customer portal users who should be told about a fault raised
 * against their customer account. Faults carry a `customerId`, which is NOT a
 * user id — notifications must be addressed to that customer's portal users.
 */
@Injectable()
export class FaultNotificationRecipients {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  async portalUserIdsForCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<string[]> {
    const users = await this.prisma.customerPortalUser.findMany({
      where: { tenantId, customerId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    return users.map((u: { id: string }) => u.id);
  }

  /**
   * The provider code, included in customer-facing mail so a customer signing
   * in on a new device always has it to hand.
   */
  async tenantCode(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { code: true },
    });
    return tenant?.code ?? '';
  }
}

@EventsHandler(FaultCreatedEvent)
export class FaultCreatedHandler implements IEventHandler<FaultCreatedEvent> {
  private readonly logger = new Logger(FaultCreatedHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly inApp: InAppNotificationService,
    private readonly recipients: FaultNotificationRecipients,
  ) {}

  async handle(event: FaultCreatedEvent) {
    this.logger.log(`Handling FaultCreatedEvent for fault ${event.faultId}`);

    if (!event.customerId) return;

    const [portalUserIds, tenantCode] = await Promise.all([
      this.recipients.portalUserIdsForCustomer(
        event.tenantId,
        event.customerId,
      ),
      this.recipients.tenantCode(event.tenantId),
    ]);

    for (const portalUserId of portalUserIds) {
      await this.notificationsService.sendEmail(
        event.tenantId,
        portalUserId,
        'FAULT_CREATED',
        { faultNumber: event.faultNumber, title: event.title, tenantCode },
        'PORTAL_USER',
      );
    }
  }
}

@EventsHandler(FaultAssignedEvent)
export class FaultAssignedHandler implements IEventHandler<FaultAssignedEvent> {
  private readonly logger = new Logger(FaultAssignedHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly inApp: InAppNotificationService,
  ) {}

  async handle(event: FaultAssignedEvent) {
    this.logger.log(`Handling FaultAssignedEvent for fault ${event.faultId}`);

    await this.notificationsService.sendEmail(
      event.tenantId,
      event.assignedToId,
      'FAULT_ASSIGNED',
      { faultNumber: event.faultNumber },
    );
    await this.inApp.create({
      tenantId: event.tenantId,
      recipientId: event.assignedToId,
      category: 'FAULT',
      title: 'Fault assigned to you',
      body: `Fault ${event.faultNumber} has been assigned to you.`,
      deepLinkRoute: `/faults/${event.faultId}`,
    });
  }
}

@EventsHandler(FaultEscalatedEvent)
export class FaultEscalatedHandler
  implements IEventHandler<FaultEscalatedEvent>
{
  private readonly logger = new Logger(FaultEscalatedHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly inApp: InAppNotificationService,
  ) {}

  async handle(event: FaultEscalatedEvent) {
    this.logger.log(`Handling FaultEscalatedEvent for fault ${event.faultId}`);

    if (event.escalatedToId) {
      await this.notificationsService.sendEmail(
        event.tenantId,
        event.escalatedToId,
        'FAULT_ESCALATED',
        { id: event.faultId },
      );
      await this.inApp.create({
        tenantId: event.tenantId,
        recipientId: event.escalatedToId,
        category: 'FAULT',
        title: 'Fault escalated to you',
        body: `Fault #${event.faultId} has been escalated and needs attention.`,
        deepLinkRoute: `/faults/${event.faultId}`,
      });
    }
  }
}

@EventsHandler(FaultStatusUpdatedEvent)
export class FaultStatusUpdatedHandler
  implements IEventHandler<FaultStatusUpdatedEvent>
{
  private readonly logger = new Logger(FaultStatusUpdatedHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly recipients: FaultNotificationRecipients,
  ) {}

  async handle(event: FaultStatusUpdatedEvent) {
    this.logger.log(
      `Handling FaultStatusUpdatedEvent for fault ${event.faultId}, new status: ${event.newStatus}`,
    );

    if (
      !event.customerId ||
      (event.newStatus !== 'RESOLVED' && event.newStatus !== 'CLOSED')
    ) {
      return;
    }

    // `customerId` identifies the customer account, not a notifiable identity;
    // fan out to that customer's active portal users instead.
    const [portalUserIds, tenantCode] = await Promise.all([
      this.recipients.portalUserIdsForCustomer(
        event.tenantId,
        event.customerId,
      ),
      this.recipients.tenantCode(event.tenantId),
    ]);

    for (const portalUserId of portalUserIds) {
      await this.notificationsService.sendEmail(
        event.tenantId,
        portalUserId,
        'FAULT_RESOLVED',
        {
          id: event.faultId,
          faultNumber: event.faultNumber ?? event.faultId,
          status: event.newStatus,
          tenantCode,
        },
        'PORTAL_USER',
      );
    }
  }
}

@EventsHandler(FaultCommentedEvent)
export class FaultCommentedHandler
  implements IEventHandler<FaultCommentedEvent>
{
  private readonly logger = new Logger(FaultCommentedHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly inApp: InAppNotificationService,
  ) {}

  async handle(event: FaultCommentedEvent) {
    this.logger.log(`Handling FaultCommentedEvent for fault ${event.faultId}`);

    if (!event.assignedToId) return;

    await this.notificationsService.sendEmail(
      event.tenantId,
      event.assignedToId,
      'FAULT_COMMENT_ADDED',
      { faultNumber: event.faultNumber },
    );
    await this.inApp.create({
      tenantId: event.tenantId,
      recipientId: event.assignedToId,
      category: 'FAULT',
      title: 'Customer replied',
      body: `The customer added a note to fault ${event.faultNumber}.`,
      deepLinkRoute: `/faults/${event.faultId}`,
    });
  }
}

@EventsHandler(FaultReopenedEvent)
export class FaultReopenedHandler implements IEventHandler<FaultReopenedEvent> {
  private readonly logger = new Logger(FaultReopenedHandler.name);

  constructor(private readonly inApp: InAppNotificationService) {}

  async handle(event: FaultReopenedEvent) {
    this.logger.log(`Handling FaultReopenedEvent for fault ${event.faultId}`);

    if (!event.assignedToId) return;

    await this.inApp.create({
      tenantId: event.tenantId,
      recipientId: event.assignedToId,
      category: 'FAULT',
      title: 'Fault reopened',
      body: `Fault ${event.faultNumber} was reopened and needs attention.`,
      deepLinkRoute: `/faults/${event.faultId}`,
    });
  }
}

@EventsHandler(FaultSlaWarningEvent)
export class FaultSlaWarningHandler
  implements IEventHandler<FaultSlaWarningEvent>
{
  private readonly logger = new Logger(FaultSlaWarningHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly inApp: InAppNotificationService,
  ) {}

  async handle(event: FaultSlaWarningEvent) {
    this.logger.log(`Handling FaultSlaWarningEvent for fault ${event.faultId}`);

    if (!event.assignedToId) return;

    await this.notificationsService.sendEmail(
      event.tenantId,
      event.assignedToId,
      'FAULT_SLA_WARNING',
      {
        faultNumber: event.faultNumber,
        slaDeadline: event.slaDeadline.toISOString(),
      },
    );
    await this.inApp.create({
      tenantId: event.tenantId,
      recipientId: event.assignedToId,
      category: 'FAULT',
      title: 'Fault approaching SLA breach',
      body: `Fault ${event.faultNumber} is approaching its SLA deadline.`,
      deepLinkRoute: `/faults/${event.faultId}`,
    });
  }
}

export const FaultEventsHandler = [
  FaultCreatedHandler,
  FaultAssignedHandler,
  FaultEscalatedHandler,
  FaultStatusUpdatedHandler,
  FaultCommentedHandler,
  FaultReopenedHandler,
  FaultSlaWarningHandler,
];
