import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { WhatsAppService } from './whatsapp.service';

export interface EmailJobData {
  readonly notificationLogId: string;
  readonly tenantId: string;
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

export interface WhatsAppJobData {
  readonly notificationLogId: string;
  readonly tenantId: string;
  readonly to: string;
  readonly body: string;
}

export interface PushJobData {
  readonly notificationLogId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly title: string;
  readonly body: string;
}

/**
 * Channel-split delivery workers (SCALABILITY_AUDIT: a single queue let a
 * slow SMTP server starve fast push sends). Each channel gets its own queue
 * and concurrency; failed jobs stay on the queue (bounded) as the dead-letter
 * set, inspectable via Bull Board at /queues.
 */
@Processor('notifications-email')
export class EmailNotificationsProcessor {
  private readonly logger = new Logger(EmailNotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  // SMTP is the slowest channel — modest parallelism avoids provider limits
  @Process({ name: 'send-email', concurrency: 5 })
  async handleSendEmail(job: Job<EmailJobData>): Promise<void> {
    const { notificationLogId, tenantId, to, subject, body } = job.data;

    const delivered = await this.notificationsService.sendRawEmail(
      to,
      subject,
      body,
      tenantId,
    );

    if (!delivered) {
      // Throwing lets Bull retry with the configured backoff; the log is
      // marked FAILED only after the final attempt.
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (isFinalAttempt) {
        await this.prisma.notificationLog.update({
          where: { id: notificationLogId },
          data: { status: 'FAILED', error: 'SMTP delivery failed' },
        });
      }
      throw new Error(`Email delivery failed for log ${notificationLogId}`);
    }

    await this.prisma.notificationLog.update({
      where: { id: notificationLogId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    this.logger.log(`Email delivered (log ${notificationLogId})`);
  }
}

@Processor('notifications-whatsapp')
export class WhatsAppNotificationsProcessor {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  @Process({ name: 'send-whatsapp', concurrency: 10 })
  async handleSendWhatsApp(job: Job<WhatsAppJobData>): Promise<void> {
    const { notificationLogId, to, body } = job.data;

    const delivered = await this.whatsAppService.sendText(to, body);

    if (!delivered) {
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (isFinalAttempt) {
        await this.prisma.notificationLog.update({
          where: { id: notificationLogId },
          data: { status: 'FAILED', error: 'WhatsApp delivery failed' },
        });
      }
      throw new Error(`WhatsApp delivery failed for log ${notificationLogId}`);
    }

    await this.prisma.notificationLog.update({
      where: { id: notificationLogId },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }
}

@Processor('notifications-push')
export class PushNotificationsProcessor {
  constructor(
    private readonly pushService: PushService,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  // FCM multicast is fast and rate-tolerant — highest concurrency
  @Process({ name: 'send-push', concurrency: 20 })
  async handleSendPush(job: Job<PushJobData>): Promise<void> {
    const { notificationLogId, userId, title, body } = job.data;

    const reached = await this.pushService.sendToUser(userId, {
      title,
      body,
    });

    // Zero registered devices is a terminal, non-retryable outcome
    await this.prisma.notificationLog.update({
      where: { id: notificationLogId },
      data:
        reached > 0
          ? { status: 'SENT', sentAt: new Date() }
          : { status: 'FAILED', error: 'No registered devices reached' },
    });
  }
}

export const NotificationsProcessors = [
  EmailNotificationsProcessor,
  WhatsAppNotificationsProcessor,
  PushNotificationsProcessor,
];
