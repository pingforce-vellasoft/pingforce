import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { NotificationsService } from './notifications.service';

export interface EmailJobData {
  readonly notificationLogId: string;
  readonly tenantId: string;
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}

/**
 * Durable email dispatch (Email.md §4): the queue provides retries with
 * backoff; the NotificationLog row tracks the delivery lifecycle.
 */
@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>): Promise<void> {
    const { notificationLogId, to, subject, body } = job.data;

    const delivered = await this.notificationsService.sendRawEmail(
      to,
      subject,
      body,
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
