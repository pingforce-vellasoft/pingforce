import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { FaultEventsHandler } from './handlers/fault-events.handler';

@Module({
  imports: [CqrsModule, BullModule.registerQueue({ name: 'notifications' })],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    ...FaultEventsHandler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
