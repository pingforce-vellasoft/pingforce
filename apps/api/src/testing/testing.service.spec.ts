import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TestingService } from './testing.service';
import { AuditService } from '../audit/audit.service';
import { SessionService } from '../auth/session.service';
import { ResetGateChainDto } from './dto/reset-gate-chain.dto';

/**
 * Gate-chain reset (non-production test support).
 *
 * The property under test throughout: this endpoint undoes authentication
 * state — it clears the forced-password flag, deletes the profile, and unbinds
 * the handset an employee's attendance is pinned to. Every guard that keeps it
 * from being reachable in production, or from being pointed at a real account,
 * is load-bearing.
 */

const TENANT = { id: 't1' };
const USER = {
  id: 'u1',
  mustChangePassword: false,
  employee: { id: 'e1' },
  profile: { id: 'p1' },
};

interface Overrides {
  tenant?: unknown;
  user?: unknown;
}

function makeService(o: Overrides = {}) {
  const prisma = {
    tenant: {
      findFirst: jest
        .fn()
        .mockResolvedValue(o.tenant === undefined ? TENANT : o.tenant),
    },
    user: {
      findFirst: jest
        .fn()
        .mockResolvedValue(o.user === undefined ? USER : o.user),
      update: jest.fn().mockReturnValue({ __op: 'user.update' }),
    },
    userProfile: {
      deleteMany: jest.fn().mockReturnValue({ __op: 'profile.deleteMany' }),
    },
    employee: {
      update: jest.fn().mockReturnValue({ __op: 'employee.update' }),
    },
    employeeDevice: {
      deleteMany: jest.fn().mockReturnValue({ __op: 'device.deleteMany' }),
    },
    deviceChangeRequest: {
      deleteMany: jest.fn().mockReturnValue({ __op: 'dcr.deleteMany' }),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };

  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const sessions = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };

  const service = new TestingService(
    prisma as never,
    audit as unknown as AuditService,
    sessions as unknown as SessionService,
  );

  return { service, prisma, audit, sessions };
}

function dto(over: Partial<ResetGateChainDto> = {}): ResetGateChainDto {
  return {
    tenantCode: 'ACME',
    email: 'gatetest@example.com',
    ...over,
  } as ResetGateChainDto;
}

const ACTOR = { superAdminId: 'sa1' };

describe('TestingService', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalFlag = process.env.ALLOW_TEST_RESET_ENDPOINT;

  function enable() {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_TEST_RESET_ENDPOINT = 'true';
  }

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalFlag === undefined) {
      delete process.env.ALLOW_TEST_RESET_ENDPOINT;
    } else {
      process.env.ALLOW_TEST_RESET_ENDPOINT = originalFlag;
    }
  });

  describe('environment gating', () => {
    it('is disabled in production even when the opt-in flag is set', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_TEST_RESET_ENDPOINT = 'true';
      expect(TestingService.isEnabled()).toBe(false);
    });

    it('is disabled in development without the opt-in flag', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOW_TEST_RESET_ENDPOINT;
      expect(TestingService.isEnabled()).toBe(false);
    });

    it('is disabled when NODE_ENV is unset', () => {
      delete process.env.NODE_ENV;
      process.env.ALLOW_TEST_RESET_ENDPOINT = 'true';
      expect(TestingService.isEnabled()).toBe(false);
    });

    it('is enabled only in development/test with the opt-in flag', () => {
      process.env.ALLOW_TEST_RESET_ENDPOINT = 'true';
      for (const env of ['development', 'test']) {
        process.env.NODE_ENV = env;
        expect(TestingService.isEnabled()).toBe(true);
      }
    });

    // The module is not mounted in production, so this path should be
    // unreachable — it is the backstop for a misconfigured deploy.
    it('refuses to reset when disabled, without confirming the route exists', async () => {
      process.env.NODE_ENV = 'production';
      const { service, prisma } = makeService();

      await expect(service.resetGateChain(dto(), ACTOR)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuses to inspect when disabled', async () => {
      process.env.NODE_ENV = 'production';
      const { service } = makeService();

      await expect(
        service.inspectGateChain('ACME', 'gatetest@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('test-account guard', () => {
    // The blast radius of a mistyped email is a destroyed profile and an
    // unbound handset, so the account has to announce itself as test data.
    it('refuses an account whose email does not mark it as a test account', async () => {
      enable();
      const { service, prisma } = makeService();

      await expect(
        service.resetGateChain(dto({ email: 'real.employee@acme.com' }), ACTOR),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('accepts a plus-addressed test account', async () => {
      enable();
      const { service } = makeService();

      await expect(
        service.resetGateChain(
          dto({ email: 'someone+gatetest@acme.com' }),
          ACTOR,
        ),
      ).resolves.toBeDefined();
    });

    it('matches the marker case-insensitively', async () => {
      enable();
      const { service } = makeService();

      await expect(
        service.resetGateChain(dto({ email: 'GateTest@ACME.com' }), ACTOR),
      ).resolves.toBeDefined();
    });
  });

  describe('resetGateChain', () => {
    it('rejects an unknown tenant', async () => {
      enable();
      const { service } = makeService({ tenant: null });

      await expect(service.resetGateChain(dto(), ACTOR)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects an unknown user', async () => {
      enable();
      const { service } = makeService({ user: null });

      await expect(service.resetGateChain(dto(), ACTOR)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('re-arms every gate by default', async () => {
      enable();
      const { service, prisma } = makeService();

      const result = await service.resetGateChain(dto(), ACTOR);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mustChangePassword: true }),
        }),
      );
      expect(prisma.userProfile.deleteMany).toHaveBeenCalled();
      expect(prisma.employee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deviceBoundAt: null }),
        }),
      );
      expect(prisma.employeeDevice.deleteMany).toHaveBeenCalled();

      expect(result.mustChangePassword).toBe(true);
      expect(result.isOnboarded).toBe(false);
      expect(result.deviceBound).toBe(false);
    });

    it('applies every write in a single transaction', async () => {
      enable();
      const { service, prisma } = makeService();

      await service.resetGateChain(dto(), ACTOR);

      // A half-applied rewind leaves the account in a state the chain cannot
      // clear (profile gone but handset still bound).
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          { __op: 'user.update' },
          { __op: 'profile.deleteMany' },
          { __op: 'employee.update' },
          { __op: 'device.deleteMany' },
        ]),
      );
    });

    it('honours per-gate opt-outs', async () => {
      enable();
      const { service, prisma } = makeService();

      const result = await service.resetGateChain(
        dto({ resetProfile: false, resetDeviceBinding: false }),
        ACTOR,
      );

      expect(prisma.userProfile.deleteMany).not.toHaveBeenCalled();
      expect(prisma.employeeDevice.deleteMany).not.toHaveBeenCalled();
      expect(result.isOnboarded).toBe(true);
      expect(result.deviceBound).toBe(true);
    });

    // Without this the handset resumes mid-chain on a token minted before the
    // rewind, with the old flags still cached in AuthSession.
    it('bumps tokenVersion and cuts live sessions', async () => {
      enable();
      const { service, prisma, sessions } = makeService();

      await service.resetGateChain(dto(), ACTOR);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
        }),
      );
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
        't1',
        'u1',
        'TEST_RESET',
      );
    });

    it('leaves the password alone when none is supplied', async () => {
      enable();
      const { service, prisma } = makeService();

      const result = await service.resetGateChain(dto(), ACTOR);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            passwordHash: expect.anything(),
          }),
        }),
      );
      expect(result.passwordReset).toBe(false);
    });

    it('hashes a supplied password rather than storing it raw', async () => {
      enable();
      const { service, prisma } = makeService();

      const result = await service.resetGateChain(
        dto({ password: 'TestPass123!' }),
        ACTOR,
      );

      const data = prisma.user.update.mock.calls[0][0].data;
      expect(data.passwordHash).toBeDefined();
      expect(data.passwordHash).not.toBe('TestPass123!');
      expect(data.passwordHash).toMatch(/^\$argon2/);
      expect(result.passwordReset).toBe(true);
    });

    it('skips device writes for a non-employee account', async () => {
      enable();
      const { service, prisma } = makeService({
        user: { ...USER, employee: null },
      });

      const result = await service.resetGateChain(dto(), ACTOR);

      expect(prisma.employee.update).not.toHaveBeenCalled();
      expect(prisma.employeeDevice.deleteMany).not.toHaveBeenCalled();
      // Back-office logins never bind a handset — reported bound so the mobile
      // gate cannot trap them.
      expect(result.deviceBound).toBe(true);
    });

    it('audits the reset as a high-severity event', async () => {
      enable();
      const { service, audit } = makeService();

      await service.resetGateChain(dto(), ACTOR);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'TESTING',
          action: 'GATE_CHAIN_RESET',
          severity: 'HIGH',
          actorId: 'sa1',
          tenantId: 't1',
        }),
      );
    });

    it('flags that the permissions gate is device-local', async () => {
      enable();
      const { service } = makeService();

      const result = await service.resetGateChain(dto(), ACTOR);

      expect(result.note).toMatch(/permissionsFlowSeen/);
    });
  });

  describe('inspectGateChain', () => {
    it('reports the current flags without writing', async () => {
      enable();
      const { service, prisma, sessions } = makeService({
        user: {
          ...USER,
          mustChangePassword: true,
          profile: null,
          employee: { deviceBoundAt: null },
        },
      });

      const result = await service.inspectGateChain(
        'ACME',
        'gatetest@example.com',
      );

      expect(result.mustChangePassword).toBe(true);
      expect(result.isOnboarded).toBe(false);
      expect(result.deviceBound).toBe(false);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('reports a fully cleared account', async () => {
      enable();
      const { service } = makeService({
        user: {
          ...USER,
          mustChangePassword: false,
          profile: { id: 'p1' },
          employee: { deviceBoundAt: new Date() },
        },
      });

      const result = await service.inspectGateChain(
        'ACME',
        'gatetest@example.com',
      );

      expect(result.mustChangePassword).toBe(false);
      expect(result.isOnboarded).toBe(true);
      expect(result.deviceBound).toBe(true);
    });

    // Inspection is read-only, but it still reveals whether an account exists,
    // so it must not be reachable by a tenant-scoped caller in production.
    it('is refused when the endpoint is disabled', async () => {
      process.env.NODE_ENV = 'production';
      const { service } = makeService();

      await expect(
        service.inspectGateChain('ACME', 'gatetest@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
