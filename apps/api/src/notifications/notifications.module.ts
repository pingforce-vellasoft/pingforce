import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessors } from './notifications.processor';
import { NotificationsController } from './notifications.controller';
import { PushService } from './push.service';
import { WhatsAppService } from './whatsapp.service';
import { TenantEmailConfigService } from './tenant-email-config.service';
import { FaultEventsHandler } from './handlers/fault-events.handler';
import { VisitEventsHandler } from './handlers/visit-events.handler';
import { LeadEventsHandler } from './handlers/lead-events.handler';

@Module({
  imports: [
    CqrsModule,
    // Channel-split queues: slow SMTP can no longer starve push/WhatsApp
    BullModule.registerQueue(
      { name: 'notifications-email' },
      { name: 'notifications-whatsapp' },
      { name: 'notifications-push' },
    ),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    ...NotificationsProcessors,
    PushService,
    WhatsAppService,
    TenantEmailConfigService,
    ...FaultEventsHandler,
    ...VisitEventsHandler,
    ...LeadEventsHandler,
  ],
  exports: [
    NotificationsService,
    PushService,
    WhatsAppService,
    TenantEmailConfigService,
  ],
})
export class NotificationsModule {}
