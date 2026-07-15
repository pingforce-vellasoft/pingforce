import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { FaultEventsHandler } from './handlers/fault-events.handler';
import { VisitEventsHandler } from './handlers/visit-events.handler';
import { LeadEventsHandler } from './handlers/lead-events.handler';

@Module({
  imports: [CqrsModule, BullModule.registerQueue({ name: 'notifications' })],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    ...FaultEventsHandler,
    ...VisitEventsHandler,
    ...LeadEventsHandler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
