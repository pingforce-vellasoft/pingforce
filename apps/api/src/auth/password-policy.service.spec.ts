import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordPolicyService } from './password-policy.service';

/** PasswordPolicy.md §7 (history / PWD-002) + §12 (lockout / PWD-006). */
function makeService(opts: { failedCountAfterIncrement?: number } = {}) {
  const prisma = {
    user: {
      update: jest
        .fn()
        .mockResolvedValue({
          failedLoginCount: opts.failedCountAfterIncrement ?? 1,
        }),
      findFirst: jest.fn(),
    },
    passwordHistory: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockReturnValue('create-op'),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new PasswordPolicyService(
    prisma as unknown as ConstructorParameters<typeof PasswordPolicyService>[0],
    audit as unknown as ConstructorParameters<typeof PasswordPolicyService>[1],
  );
  return { service, prisma, audit };
}

describe('PasswordPolicyService — lockout', () => {
  it('defaults to 5 attempts / 30 minutes', () => {
    const { service } = makeService();
    expect(service.lockoutThreshold).toBe(5);
    expect(service.lockoutMinutes).toBe(30);
    expect(service.historyDepth).toBe(10);
  });

  it('isLocked only while lockedUntil is in the future', () => {
    const { service } = makeService();
    expect(service.isLocked({ id: 'u', lockedUntil: null })).toBe(false);
    expect(
      service.isLocked({ id: 'u', lockedUntil: new Date(Date.now() - 1000) }),
    ).toBe(false);
    expect(
      service.isLocked({ id: 'u', lockedUntil: new Date(Date.now() + 60_000) }),
    ).toBe(true);
  });

  it('assertNotLocked throws PWD-006 when locked', () => {
    const { service } = makeService();
    expect(() =>
      service.assertNotLocked({
        id: 'u',
        lockedUntil: new Date(Date.now() + 60_000),
      }),
    ).toThrow(ForbiddenException);
  });

  it('below threshold: increments only, no lock, no audit', async () => {
    const { service, prisma, audit } = makeService({
      failedCountAfterIncrement: 4,
    });
    const locked = await service.registerFailedAttempt('t1', 'u1');
    expect(locked).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginCount: { increment: 1 } },
      }),
    );
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('at threshold: sets lockedUntil ~30 min out, resets counter, audits ACCOUNT_LOCKED', async () => {
    const { service, prisma, audit } = makeService({
      failedCountAfterIncrement: 5,
    });
    const before = Date.now();
    const locked = await service.registerFailedAttempt('t1', 'u1');
    expect(locked).toBe(true);
    const lockCall = prisma.user.update.mock.calls[1][0];
    expect(lockCall.data.failedLoginCount).toBe(0);
    const until = (lockCall.data.lockedUntil as Date).getTime();
    expect(until).toBeGreaterThanOrEqual(before + 30 * 60_000);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACCOUNT_LOCKED', severity: 'HIGH' }),
    );
  });

  it('resetFailedAttempts skips the write when nothing to clear', async () => {
    const { service, prisma } = makeService();
    await service.resetFailedAttempts({
      id: 'u1',
      failedLoginCount: 0,
      lockedUntil: null,
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    await service.resetFailedAttempts({
      id: 'u1',
      failedLoginCount: 2,
      lockedUntil: null,
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  });

  it('unlock is tenant-scoped and audited', async () => {
    const { service, prisma, audit } = makeService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      lockedUntil: new Date(Date.now() + 60_000),
      failedLoginCount: 0,
    });
    await service.unlock('t1', 'u1', 'admin1');
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1', tenantId: 't1', deletedAt: null },
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ACCOUNT_UNLOCKED',
        actorId: 'admin1',
      }),
    );
  });

  it('unlock of a user outside the tenant is 404', async () => {
    const { service, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.unlock('t1', 'other', 'admin1')).rejects.toThrow(
      'User not found',
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('PasswordPolicyService — history', () => {
  it('rejects reuse of the current password (PWD-002)', async () => {
    const { service } = makeService();
    const current = await argon2.hash('Current#Pass123');
    await expect(
      service.assertNotReused('u1', current, 'Current#Pass123'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects reuse of a remembered password and reads only historyDepth rows', async () => {
    const { service, prisma } = makeService();
    const current = await argon2.hash('Current#Pass123');
    const old = await argon2.hash('Old#Password999');
    prisma.passwordHistory.findMany.mockResolvedValue([{ passwordHash: old }]);
    await expect(
      service.assertNotReused('u1', current, 'Old#Password999'),
    ).rejects.toThrow('PWD-002');
    expect(prisma.passwordHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    );
  });

  it('accepts a fresh password', async () => {
    const { service } = makeService();
    const current = await argon2.hash('Current#Pass123');
    await expect(
      service.assertNotReused('u1', current, 'Brand#NewPass456'),
    ).resolves.toBeUndefined();
  });

  it('archiveHash returns a create op for the caller transaction', () => {
    const { service, prisma } = makeService();
    const op = service.archiveHash('t1', 'u1', 'hash-old');
    expect(op).toBe('create-op');
    expect(prisma.passwordHistory.create).toHaveBeenCalledWith({
      data: {
        tenantId: 't1',
        userId: 'u1',
        passwordHash: 'hash-old',
        createdBy: 'u1',
      },
    });
  });
});
