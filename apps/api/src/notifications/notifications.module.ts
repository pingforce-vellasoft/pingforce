import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessors } from './notifications.processor';
import { NotificationsController } from './notifications.controller';
import { InAppNotificationController } from './in-app-notification.controller';
import { InAppNotificationService } from './in-app-notification.service';
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
  controllers: [NotificationsController, InAppNotificationController],
  providers: [
    NotificationsService,
    InAppNotificationService,
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
    InAppNotificationService,
    PushService,
    WhatsAppService,
    TenantEmailConfigService,
  ],
})
export class NotificationsModule {}
