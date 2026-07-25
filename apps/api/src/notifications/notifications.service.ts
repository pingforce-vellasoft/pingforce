import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { IPrismaService } from '@pingforce-monorepo/shared';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { TenantEmailConfigService } from './tenant-email-config.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: Transporter | null = null;
  private readonly fromAddress: string;

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly config: ConfigService,
    @InjectQueue('notifications-email') private readonly emailQueue: Queue,
    @InjectQueue('notifications-whatsapp')
    private readonly whatsappQueue: Queue,
    @InjectQueue('notifications-push') private readonly pushQueue: Queue,
    private readonly tenantEmailConfig: TenantEmailConfigService,
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
   * Low-level delivery. When tenantId is given and the tenant has an ACTIVE
   * email provider config, that transport is used (Email.md §5); otherwise
   * the global SMTP transport, and when neither is configured the send is
   * logged. Returns true when handed to a transport successfully.
   */
  async sendRawEmail(
    to: string,
    subject: string,
    body: string,
    tenantId?: string,
  ): Promise<boolean> {
    const tenantTransport =
      tenantId && tenantId !== 'SYSTEM'
        ? await this.tenantEmailConfig.getTransport(tenantId)
        : null;

    const transporter = tenantTransport?.transporter ?? this.transporter;
    const from = tenantTransport?.fromAddress ?? this.fromAddress;

    if (!transporter) {
      this.logger.log(`[EMAIL:simulated] To: ${to}, Subject: ${subject}`);
      return true;
    }

    try {
      await transporter.sendMail({
        from,
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
      where: { id: recipientId, tenantId, deletedAt: null },
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
    await this.emailQueue.add(
      'send-email',
      {
        notificationLogId: log.id,
        tenantId,
        to: recipient.email,
        subject: compiledSubject,
        body: compiledBody,
      },
      NotificationsService.jobOpts,
    );
  }

  // Failed jobs stay on the queue (bounded) as the dead-letter set — visible
  // and retryable from Bull Board, instead of vanishing silently.
  private static readonly jobOpts = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 1000,
  } as const;

  /**
   * Text-channel notification. Delivered over WhatsApp Cloud API when
   * configured (Master Plan Phase 2 — replaces the SMS gateway); otherwise
   * simulated. Accepts SMS or WHATSAPP template types so existing SMS
   * templates keep working.
   */
  async sendSms(
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
      (template.type !== 'SMS' && template.type !== 'WHATSAPP')
    ) {
      this.logger.warn(
        `SMS/WhatsApp template ${templateName} not found or inactive for tenant ${tenantId}`,
      );
      return;
    }

    const compiledBody = this.compileTemplate(template.body, payload);

    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        recipientId,
        type: 'WHATSAPP',
        body: compiledBody,
        status: 'PENDING',
      },
    });

    const recipient = await this.prisma.user.findFirst({
      where: { id: recipientId, tenantId, deletedAt: null },
      select: { phone: true },
    });

    if (!recipient?.phone) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: 'Recipient has no phone number' },
      });
      return;
    }

    await this.whatsappQueue.add(
      'send-whatsapp',
      {
        notificationLogId: log.id,
        tenantId,
        to: recipient.phone,
        body: compiledBody,
      },
      NotificationsService.jobOpts,
    );
  }

  /**
   * Push notification via FCM (Master Plan Phase 2). Template type PUSH;
   * subject → notification title, body → notification body.
   */
  async sendPush(
    tenantId: string,
    recipientId: string,
    templateName: string,
    payload: any,
  ): Promise<void> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { tenantId_name: { tenantId, name: templateName } },
    });

    if (!template || template.status !== 'ACTIVE' || template.type !== 'PUSH') {
      this.logger.warn(
        `Push template ${templateName} not found or inactive for tenant ${tenantId}`,
      );
      return;
    }

    const compiledBody = this.compileTemplate(template.body, payload);
    const compiledTitle = template.subject
      ? this.compileTemplate(template.subject, payload)
      : 'PingForce';

    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        recipientId,
        type: 'PUSH',
        subject: compiledTitle,
        body: compiledBody,
        status: 'PENDING',
      },
    });

    await this.pushQueue.add(
      'send-push',
      {
        notificationLogId: log.id,
        tenantId,
        userId: recipientId,
        title: compiledTitle,
        body: compiledBody,
      },
      NotificationsService.jobOpts,
    );
  }
}
