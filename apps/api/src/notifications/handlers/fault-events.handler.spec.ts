import {
  FaultNotificationRecipients,
  FaultStatusUpdatedHandler,
  FaultAssignedHandler,
} from './fault-events.handler';
import {
  FaultAssignedEvent,
  FaultStatusUpdatedEvent,
} from '../../faults/events/impl';

/**
 * A fault carries `customerId`, which identifies a customer account — not a
 * notifiable identity. Addressing resolution notices to it meant they were
 * looked up against the staff `users` table and silently never delivered.
 * These tests pin the fan-out to the customer's portal users instead.
 */

const TENANT = 't1';
const CUSTOMER = 'cust-1';

function makeHandler(portalUsers: { id: string }[]) {
  const prisma = {
    customerPortalUser: {
      findMany: jest.fn().mockResolvedValue(portalUsers),
    },
    tenant: {
      findUnique: jest.fn().mockResolvedValue({ code: 'ACME' }),
    },
  };
  const recipients = new FaultNotificationRecipients(prisma as any);
  const notifications = { sendEmail: jest.fn().mockResolvedValue(undefined) };
  const handler = new FaultStatusUpdatedHandler(
    notifications as any,
    recipients,
  );
  return { handler, notifications, prisma };
}

describe('FaultStatusUpdatedHandler', () => {
  it('emails every active portal user of the customer, not the customer id', async () => {
    const { handler, notifications, prisma } = makeHandler([
      { id: 'pu-1' },
      { id: 'pu-2' },
    ]);

    await handler.handle(
      new FaultStatusUpdatedEvent(TENANT, 'f1', 'RESOLVED', CUSTOMER, 'PF-1'),
    );

    expect(prisma.customerPortalUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          customerId: CUSTOMER,
          deletedAt: null,
          status: 'ACTIVE',
        }),
      }),
    );

    expect(notifications.sendEmail).toHaveBeenCalledTimes(2);
    const recipientIds = notifications.sendEmail.mock.calls.map((c) => c[1]);
    expect(recipientIds).toEqual(['pu-1', 'pu-2']);
    expect(recipientIds).not.toContain(CUSTOMER);

    // Delivery address must be resolved from the portal-user table.
    for (const call of notifications.sendEmail.mock.calls) {
      expect(call[4]).toBe('PORTAL_USER');
      // Customer mail carries the provider code for new-device sign-in.
      expect(call[3]).toMatchObject({ tenantCode: 'ACME' });
    }
  });

  it('stays silent for non-terminal status changes', async () => {
    const { handler, notifications } = makeHandler([{ id: 'pu-1' }]);

    await handler.handle(
      new FaultStatusUpdatedEvent(TENANT, 'f1', 'IN_PROGRESS', CUSTOMER),
    );

    expect(notifications.sendEmail).not.toHaveBeenCalled();
  });

  it('stays silent for a fault with no customer', async () => {
    const { handler, notifications } = makeHandler([{ id: 'pu-1' }]);

    await handler.handle(
      new FaultStatusUpdatedEvent(TENANT, 'f1', 'RESOLVED', undefined),
    );

    expect(notifications.sendEmail).not.toHaveBeenCalled();
  });
});

describe('FaultAssignedHandler', () => {
  it('notifies the assignee over email and in-app', async () => {
    const notifications = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const inApp = { create: jest.fn().mockResolvedValue(undefined) };
    const handler = new FaultAssignedHandler(
      notifications as any,
      inApp as any,
    );

    await handler.handle(
      new FaultAssignedEvent(TENANT, 'f1', 'PF-1', 'tech-1', 'mgr-1'),
    );

    expect(notifications.sendEmail).toHaveBeenCalledWith(
      TENANT,
      'tech-1',
      'FAULT_ASSIGNED',
      { faultNumber: 'PF-1' },
    );
    expect(inApp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'tech-1',
        category: 'FAULT',
        deepLinkRoute: '/faults/f1',
      }),
    );
  });
});
