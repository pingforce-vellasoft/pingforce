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
  readonly type: 'EMAIL' | 'SMS';
  readonly subject: string;
  readonly body: string;
}

export const DEFAULT_NOTIFICATION_TEMPLATES: readonly NotificationTemplateDef[] =
  [
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
        '<p>Your reported fault (ID: {{id}}) has been marked <strong>{{status}}</strong>.</p>' +
        '<p>If the issue persists, please raise a new ticket.</p>',
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
