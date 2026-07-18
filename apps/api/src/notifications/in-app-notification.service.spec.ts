import { InAppNotificationService } from './in-app-notification.service';

/**
 * In-app notification feed: reads and mutations are always self-scoped to the
 * recipient, create() never throws into its caller.
 */

function makeService(overrides: Record<string, jest.Mock> = {}) {
  const notification = {
    create: jest.fn().mockResolvedValue({ id: 'n1' }),
    findMany: jest.fn().mockResolvedValue([{ id: 'n1', isRead: false }]),
    count: jest.fn().mockResolvedValue(3),
    updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    ...overrides,
  };
  const prisma = { notification } as never;
  return { service: new InAppNotificationService(prisma), notification };
}

const T = 't1';
const U = 'u1';

describe('InAppNotificationService', () => {
  it('creates a notification row', async () => {
    const { service, notification } = makeService();
    await service.create({
      tenantId: T,
      recipientId: U,
      category: 'FAULT',
      title: 'Fault escalated',
      deepLinkRoute: '/faults/1',
    });
    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: T,
          recipientId: U,
          category: 'FAULT',
          deepLinkRoute: '/faults/1',
        }),
      }),
    );
  });

  it('swallows create failures (never rolls back the caller)', async () => {
    const { service } = makeService({
      create: jest.fn().mockRejectedValue(new Error('db down')),
    });
    await expect(
      service.create({
        tenantId: T,
        recipientId: U,
        category: 'SYSTEM',
        title: 'x',
      }),
    ).resolves.toBeUndefined();
  });

  it('lists only the recipient own notifications, newest first', async () => {
    const { service, notification } = makeService();
    await service.list(T, U);
    expect(notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: T,
          recipientId: U,
          deletedAt: null,
        }),
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('filters unread when unreadOnly is set', async () => {
    const { service, notification } = makeService();
    await service.list(T, U, { unreadOnly: true });
    const where = notification.findMany.mock.calls[0][0].where;
    expect(where.isRead).toBe(false);
  });

  it('caps page size at 100', async () => {
    const { service, notification } = makeService();
    await service.list(T, U, { take: 999 });
    expect(notification.findMany.mock.calls[0][0].take).toBe(100);
  });

  it('unreadCount counts only unread for the recipient', async () => {
    const { service, notification } = makeService();
    const count = await service.unreadCount(T, U);
    expect(count).toBe(3);
    expect(notification.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: T,
          recipientId: U,
          isRead: false,
        }),
      }),
    );
  });

  it('markRead scopes the update to the caller', async () => {
    const { service, notification } = makeService();
    const res = await service.markRead(T, U, 'n9');
    expect(res.updated).toBe(2);
    expect(notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'n9',
          tenantId: T,
          recipientId: U,
        }),
      }),
    );
  });

  it('markAllRead updates all unread for the caller', async () => {
    const { service, notification } = makeService();
    await service.markAllRead(T, U);
    expect(notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: T,
          recipientId: U,
          isRead: false,
        }),
        data: expect.objectContaining({ isRead: true }),
      }),
    );
  });
});
