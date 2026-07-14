import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { IPrismaService } from '@pingforce-monorepo/shared';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly config: ConfigService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {
    const host = this.config.get<string>('SMTP_HOST');
    this.fromAddress = this.config.get<string>(
      'SMTP_FROM',
      'no-reply@pingforce.in',
    );

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: this.config.get<string>('SMTP_USER')
          ? {
              user: this.config.get<string>('SMTP_USER'),
              pass: this.config.get<string>('SMTP_PASS'),
            }
          : undefined,
      });
      this.logger.log(`SMTP transport configured (${host})`);
    } else {
      this.logger.warn(
        'SMTP_HOST not set — emails will be logged, not delivered',
      );
    }
  }

  private compileTemplate(templateBody: string, payload: any): string {
    return templateBody.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => payload[key] || '',
    );
  }

  /**
   * Low-level delivery: sends via SMTP when configured, otherwise logs.
   * Returns true when the message was handed to the transport successfully.
   */
  async sendRawEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[EMAIL:simulated] To: ${to}, Subject: ${subject}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html: body,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `SMTP send failed to ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async sendEmail(
    tenantId: string,
    recipientId: string,
    templateName: string,
    payload: any,
  ): Promise<void> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { tenantId_name: { tenantId, name: templateName } },
    });

    if (
      !template ||
      template.status !== 'ACTIVE' ||
      template.type !== 'EMAIL'
    ) {
      this.logger.warn(
        `Email template ${templateName} not found or inactive for tenant ${tenantId}`,
      );
      return;
    }

    const compiledBody = this.compileTemplate(template.body, payload);
    const compiledSubject = template.subject
      ? this.compileTemplate(template.subject, payload)
      : 'Notification';

    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        recipientId,
        type: 'EMAIL',
        subject: compiledSubject,
        body: compiledBody,
        status: 'PENDING',
      },
    });

    // recipientId is a userId — resolve the delivery address
    const recipient = await this.prisma.user.findFirst({
      where: { id: recipientId, tenantId },
      select: { email: true },
    });

    if (!recipient?.email) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: 'Recipient has no email address' },
      });
      return;
    }

    // Durable dispatch via queue: retries with exponential backoff (Email.md §4)
    await this.notificationsQueue.add(
      'send-email',
      {
        notificationLogId: log.id,
        tenantId,
        to: recipient.email,
        subject: compiledSubject,
        body: compiledBody,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );
  }

  async sendSms(
    tenantId: string,
    recipientId: string,
    templateName: string,
    payload: any,
  ): Promise<void> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { tenantId_name: { tenantId, name: templateName } },
    });

    if (!template || template.status !== 'ACTIVE' || template.type !== 'SMS') {
      this.logger.warn(
        `SMS template ${templateName} not found or inactive for tenant ${tenantId}`,
      );
      return;
    }

    const compiledBody = this.compileTemplate(template.body, payload);

    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        recipientId,
        type: 'SMS',
        body: compiledBody,
        status: 'PENDING',
      },
    });

    try {
      // TODO(phase-2b): integrate SMS gateway (Twilio/SNS). Log-only for now.
      this.logger.log(`[SMS:simulated] To: ${recipientId}, Body: ${compiledBody}`);

      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (error: any) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: error.message },
      });
    }
  }
}
