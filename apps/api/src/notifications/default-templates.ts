/**
 * Single source of truth for the default per-tenant notification templates.
 *
 * Consumed by:
 *  - prisma/seed.ts (backfill of existing tenants)
 *  - TenantsService / AuthService (provisioning of new tenants)
 *
 * Template names must match what the event handlers pass to
 * NotificationsService.sendEmail — a missing/inactive template row means the
 * notification is silently skipped (Email.md §3).
 *
 * Pure constants only — no NestJS or Prisma imports, so it is safe to
 * import from the seed script.
 */

export interface NotificationTemplateDef {
  readonly name: string;
  readonly type: 'EMAIL' | 'SMS' | 'PUSH';
  readonly subject: string;
  readonly body: string;
}

export const LEAVE_NOTIFICATION_TEMPLATES: readonly NotificationTemplateDef[] =
  [
    {
      name: 'LEAVE_STATUS_EMAIL',
      type: 'EMAIL',
      subject: 'Leave request {{status}}',
      body: '<p>Your leave from {{startDate}} to {{endDate}} is {{status}}.</p><p>Open PingForce to review your leave history.</p>',
    },
    {
      name: 'LEAVE_STATUS_PUSH',
      type: 'PUSH',
      subject: 'Leave request {{status}}',
      body: 'Your leave from {{startDate}} to {{endDate}} is {{status}}.',
    },
    {
      name: 'LEAVE_REVIEW_EMAIL',
      type: 'EMAIL',
      subject: 'Leave request awaiting review',
      body: '<p>A leave request is awaiting your review. Open the Leave requests page in PingForce.</p>',
    },
    {
      name: 'LEAVE_REVIEW_PUSH',
      type: 'PUSH',
      subject: 'Leave request awaiting review',
      body: 'Open PingForce to review your leave approval queue.',
    },
  ];

export const DEFAULT_NOTIFICATION_TEMPLATES: readonly NotificationTemplateDef[] =
  [
    ...LEAVE_NOTIFICATION_TEMPLATES,
    {
      name: 'VISIT_ASSIGNED',
      type: 'EMAIL',
      subject: 'New visit assigned: {{visitNumber}}',
      body:
        '<p>A new visit <strong>{{visitNumber}}</strong> has been assigned to you.</p>' +
        '<p>Purpose: {{purpose}}</p>' +
        '<p>Open the PingForce app to review the visit details and schedule.</p>',
    },
    {
      name: 'VISIT_COMPLETED',
      type: 'EMAIL',
      subject: 'Visit completed: {{visitNumber}}',
      body:
        '<p>Visit <strong>{{visitNumber}}</strong> has been completed.</p>' +
        '<p>Status: {{status}}</p>' +
        '<p>Review the visit outcome in the admin portal.</p>',
    },
    {
      name: 'VISIT_REJECTED',
      type: 'EMAIL',
      subject: 'Visit rejected: {{visitNumber}}',
      body:
        '<p>Visit <strong>{{visitNumber}}</strong> was rejected by the assigned employee.</p>' +
        '<p>Status: {{status}}</p>' +
        '<p>Reassign the visit or contact the employee for details.</p>',
    },
    {
      name: 'LEAD_CONVERTED',
      type: 'EMAIL',
      subject: 'Lead converted: {{leadNumber}}',
      body:
        '<p>Lead <strong>{{leadNumber}}</strong> has been converted to a customer.</p>' +
        '<p>Customer ID: {{customerId}}</p>',
    },
    {
      name: 'FAULT_CREATED',
      type: 'EMAIL',
      subject: 'We have logged your issue: {{faultNumber}}',
      body:
        '<p>Your issue <strong>{{faultNumber}}</strong> has been logged.</p>' +
        '<p>Subject: {{title}}</p>' +
        '<p>You can follow its progress in the PingForce app.</p>' +
        // The provider code is what a customer needs to sign in on a new
        // device, so every customer-facing fault email carries it.
        '<p style="color:#6b7280;font-size:12px">Signing in on a new device? ' +
        'Your provider code is <strong>{{tenantCode}}</strong>.</p>',
    },
    {
      name: 'FAULT_ASSIGNED',
      type: 'EMAIL',
      subject: 'Fault assigned to you: {{faultNumber}}',
      body:
        '<p>Fault <strong>{{faultNumber}}</strong> has been assigned to you.</p>' +
        '<p>Open the PingForce app to review and start work.</p>',
    },
    {
      name: 'FAULT_COMMENT_ADDED',
      type: 'EMAIL',
      subject: 'Customer replied on {{faultNumber}}',
      body:
        '<p>The customer added a note to fault <strong>{{faultNumber}}</strong>.</p>' +
        '<p>Open the PingForce app to read it and respond.</p>',
    },
    {
      name: 'FAULT_SLA_WARNING',
      type: 'EMAIL',
      subject: 'Fault {{faultNumber}} is approaching its SLA deadline',
      body:
        '<p>Fault <strong>{{faultNumber}}</strong> is approaching its SLA deadline ({{slaDeadline}}).</p>' +
        '<p>Resolve it or escalate before the deadline passes.</p>',
    },
    {
      name: 'FAULT_ESCALATED',
      type: 'EMAIL',
      subject: 'Fault escalated to you',
      body:
        '<p>A fault (ID: {{id}}) has been escalated and assigned to you.</p>' +
        '<p>Please review it in the PingForce portal and take action.</p>',
    },
    {
      name: 'FAULT_RESOLVED',
      type: 'EMAIL',
      subject: 'Your reported issue has been resolved',
      body:
        '<p>Your reported fault <strong>{{faultNumber}}</strong> has been marked <strong>{{status}}</strong>.</p>' +
        '<p>If the issue persists, you can reopen it in the PingForce app.</p>' +
        '<p style="color:#6b7280;font-size:12px">Signing in on a new device? ' +
        'Your provider code is <strong>{{tenantCode}}</strong>.</p>',
    },
  ];

/**
 * Minimal structural type so both the Prisma client (seed) and the
 * IPrismaService transaction client (API) can be passed in.
 */
interface TemplateDbClient {
  notificationTemplate: {
    createMany(args: {
      data: {
        tenantId: string;
        name: string;
        type: string;
        subject: string;
        body: string;
        status: string;
      }[];
      skipDuplicates: boolean;
    }): Promise<unknown>;
  };
}

/**
 * Idempotently provisions the default notification templates for a tenant.
 * skipDuplicates keeps tenant-customised rows (same tenantId+name) untouched.
 */
export async function seedDefaultNotificationTemplates(
  db: TemplateDbClient,
  tenantId: string,
): Promise<void> {
  await db.notificationTemplate.createMany({
    data: DEFAULT_NOTIFICATION_TEMPLATES.map((t) => ({
      tenantId,
      name: t.name,
      type: t.type,
      subject: t.subject,
      body: t.body,
      status: 'ACTIVE',
    })),
    skipDuplicates: true,
  });
}
