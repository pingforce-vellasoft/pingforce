import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { LeadConvertedEvent } from '../../lead/events/impl';
import { NotificationsService } from '../notifications.service';

/** LEAD.CONVERTED routing (3.6 EVENT_CATALOG.md §8). Template: LEAD_CONVERTED. */
@EventsHandler(LeadConvertedEvent)
export class LeadConvertedHandler implements IEventHandler<LeadConvertedEvent> {
  private readonly logger = new Logger(LeadConvertedHandler.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  async handle(event: LeadConvertedEvent) {
    this.logger.log(
      `LeadConvertedEvent for lead ${event.leadNumber} → customer ${event.customerId}`,
    );
    if (!event.ownerUserId) return;

    await this.notificationsService.sendEmail(
      event.tenantId,
      event.ownerUserId,
      'LEAD_CONVERTED',
      { leadNumber: event.leadNumber, customerId: event.customerId },
    );
  }
}

export const LeadEventsHandler = [LeadConvertedHandler];
