import { NotFoundException } from '@nestjs/common';
import { UserSecurityService } from './user-security.service';

function makeService(user: object | null) {
  const prisma = {
    user: {
      findFirst: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const sessions = {
    listForUser: jest.fn().mockResolvedValue([{ id: 's1' }]),
    revoke: jest.fn().mockResolvedValue(undefined),
    revokeAllForUser: jest.fn().mockResolvedValue(undefined),
  };
  const policy = {
    isLocked: jest.fn().mockReturnValue(true),
    unlock: jest.fn().mockResolvedValue({ message: 'Account unlocked' }),
  };
  const service = new UserSecurityService(
    prisma as unknown as ConstructorParameters<typeof UserSecurityService>[0],
    sessions as unknown as ConstructorParameters<typeof UserSecurityService>[1],
    policy as unknown as ConstructorParameters<typeof UserSecurityService>[2],
  );
  return { service, prisma, sessions, policy };
}

const target = {
  id: 'u2',
  lockedUntil: new Date(Date.now() + 60_000),
  failedLoginCount: 0,
  passwordChangedAt: null,
  mustChangePassword: false,
};

describe('UserSecurityService', () => {
  it('every action 404s for a user outside the caller tenant', async () => {
    const { service, sessions, prisma } = makeService(null);
    await expect(service.listSessions('t1', 'u2')).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.revokeSession('t1', 'u2', 's1', 'admin'),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.revokeAllSessions('t1', 'u2', 'admin'),
    ).rejects.toThrow(NotFoundException);
    expect(sessions.revoke).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u2', tenantId: 't1', deletedAt: null },
      }),
    );
  });

  it('status reports lock state', async () => {
    const { service } = makeService(target);
    const status = await service.getStatus('t1', 'u2');
    expect(status.locked).toBe(true);
    expect(status.userId).toBe('u2');
  });

  it('revokeSession records the admin as actor', async () => {
    const { service, sessions } = makeService(target);
    await service.revokeSession('t1', 'u2', 's1', 'admin');
    expect(sessions.revoke).toHaveBeenCalledWith(
      't1',
      'u2',
      's1',
      'ADMIN_REVOKED',
      'admin',
    );
  });

  it('revokeAll bumps tokenVersion so live access tokens die', async () => {
    const { service, sessions, prisma } = makeService(target);
    await service.revokeAllSessions('t1', 'u2', 'admin');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: { tokenVersion: { increment: 1 } },
    });
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
      't1',
      'u2',
      'ADMIN_FORCED_LOGOUT',
      'admin',
    );
  });
});
