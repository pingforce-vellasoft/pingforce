import { Injectable, Inject, Logger } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject('IPrismaService') private readonly prisma: IPrismaService) {}

  private compileTemplate(templateBody: string, payload: any): string {
    return templateBody.replace(/\{\{(\w+)\}\}/g, (_, key) => payload[key] || '');
  }

  async sendEmail(tenantId: string, recipientId: string, templateName: string, payload: any) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { tenantId_name: { tenantId, name: templateName } }
    });

    if (!template || template.status !== 'ACTIVE' || template.type !== 'EMAIL') {
      this.logger.warn(`Email template ${templateName} not found or inactive for tenant ${tenantId}`);
      return;
    }

    const compiledBody = this.compileTemplate(template.body, payload);
    const compiledSubject = template.subject ? this.compileTemplate(template.subject, payload) : 'Notification';

    // Log the pending notification
    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        recipientId,
        type: 'EMAIL',
        subject: compiledSubject,
        body: compiledBody,
        status: 'PENDING',
      }
    });

    try {
      // Simulate sending email (Integration point for SendGrid/SMTP)
      this.logger.log(`[EMAIL] To: ${recipientId}, Subject: ${compiledSubject}`);
      
      // Update status to SENT
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() }
      });
    } catch (error: any) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: error.message }
      });
    }
  }

  async sendSms(tenantId: string, recipientId: string, templateName: string, payload: any) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { tenantId_name: { tenantId, name: templateName } }
    });

    if (!template || template.status !== 'ACTIVE' || template.type !== 'SMS') {
      this.logger.warn(`SMS template ${templateName} not found or inactive for tenant ${tenantId}`);
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
      }
    });

    try {
      // Simulate sending SMS (Integration point for Twilio/SNS)
      this.logger.log(`[SMS] To: ${recipientId}, Body: ${compiledBody}`);
      
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() }
      });
    } catch (error: any) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', error: error.message }
      });
    }
  }
}
