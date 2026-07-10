import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NotificationsService } from './notifications.service';
import { FaultEventsHandler } from './handlers/fault-events.handler';

@Module({
  imports: [CqrsModule],
  providers: [NotificationsService, ...FaultEventsHandler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
