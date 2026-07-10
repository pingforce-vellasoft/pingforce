import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  FaultEscalatedEvent,
  FaultStatusUpdatedEvent,
} from '../../faults/events/impl';
import { NotificationsService } from '../notifications.service';
import { Logger } from '@nestjs/common';

@EventsHandler(FaultEscalatedEvent)
export class FaultEscalatedHandler
  implements IEventHandler<FaultEscalatedEvent>
{
  private readonly logger = new Logger(FaultEscalatedHandler.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async handle(event: FaultEscalatedEvent) {
    this.logger.log(`Handling FaultEscalatedEvent for fault ${event.faultId}`);

    if (event.escalatedToId) {
      await this.notificationsService.sendEmail(
        event.tenantId,
        event.escalatedToId,
        'FAULT_ESCALATED',
        { id: event.faultId },
      );
    }
  }
}

@EventsHandler(FaultStatusUpdatedEvent)
export class FaultStatusUpdatedHandler
  implements IEventHandler<FaultStatusUpdatedEvent>
{
  private readonly logger = new Logger(FaultStatusUpdatedHandler.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async handle(event: FaultStatusUpdatedEvent) {
    this.logger.log(
      `Handling FaultStatusUpdatedEvent for fault ${event.faultId}, new status: ${event.newStatus}`,
    );

    if (
      event.customerId &&
      (event.newStatus === 'RESOLVED' || event.newStatus === 'CLOSED')
    ) {
      await this.notificationsService.sendEmail(
        event.tenantId,
        event.customerId,
        'FAULT_RESOLVED',
        { id: event.faultId, status: event.newStatus },
      );
    }
  }
}

export const FaultEventsHandler = [
  FaultEscalatedHandler,
  FaultStatusUpdatedHandler,
];
