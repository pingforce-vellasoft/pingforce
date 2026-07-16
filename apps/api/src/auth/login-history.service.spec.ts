import { LoginHistoryService } from './login-history.service';

/**
 * Login-history trail (LoginHistory.md §5/§14):
 * - writes are fire-and-forget and never throw into the auth flow,
 * - logout stamping targets only open SUCCESS rows of the session,
 * - self-service listing is tenant+user scoped and page-size capped.
 */

function makeService(overrides: Record<string, jest.Mock> = {}) {
  const prisma = {
    loginHistory: {
      create: overrides.create ?? jest.fn().mockResolvedValue({}),
      updateMany: overrides.updateMany ?? jest.fn().mockResolvedValue({}),
      findMany: overrides.findMany ?? jest.fn().mockResolvedValue([]),
      count: overrides.count ?? jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const service = new LoginHistoryService(
    prisma as unknown as ConstructorParameters<typeof LoginHistoryService>[0],
  );
  return { service, prisma };
}

const flush = () => new Promise((r) => setImmediate(r));

describe('LoginHistoryService', () => {
  it('records an entry with defaults', async () => {
    const { service, prisma } = makeService();
    service.record({
      tenantId: 't1',
      userId: 'u1',
      username: 'a@x.io',
      outcome: 'SUCCESS',
      sessionId: 's1',
    });
    await flush();
    expect(prisma.loginHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1',
        userId: 'u1',
        username: 'a@x.io',
        authMethod: 'PASSWORD',
        outcome: 'SUCCESS',
        sessionId: 's1',
      }),
    });
  });

  it('swallows write failures instead of breaking the auth flow', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const { service } = makeService({ create });
    expect(() =>
      service.record({ tenantId: 't1', username: 'a', outcome: 'SUCCESS' }),
    ).not.toThrow();
    await flush();
    expect(create).toHaveBeenCalled();
  });

  it('marks logout only on open SUCCESS rows of the session', async () => {
    const { service, prisma } = makeService();
    service.markLogout('s1');
    await flush();
    expect(prisma.loginHistory.updateMany).toHaveBeenCalledWith({
      where: { sessionId: 's1', outcome: 'SUCCESS', logoutAt: null },
      data: { logoutAt: expect.any(Date) },
    });
  });

  it('marks logout-all scoped to tenant + user', async () => {
    const { service, prisma } = makeService();
    service.markLogoutAll('t1', 'u1');
    await flush();
    expect(prisma.loginHistory.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', userId: 'u1', outcome: 'SUCCESS', logoutAt: null },
      data: { logoutAt: expect.any(Date) },
    });
  });

  it('lists own history tenant-scoped, newest first, page size capped at 100', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'lh1' }]);
    const count = jest.fn().mockResolvedValue(1);
    const { service } = makeService({ findMany, count });

    const page = await service.listForUser('t1', 'u1', 0, 999);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 't1', userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 100,
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { tenantId: 't1', userId: 'u1' },
    });
    expect(page).toEqual({
      items: [{ id: 'lh1' }],
      total: 1,
      page: 1,
      pageSize: 100,
    });
  });
});
