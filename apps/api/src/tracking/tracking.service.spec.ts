import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import type { RbacService, ResolvedDataScope } from '../rbac/rbac.service';

/**
 * Background field-operator tracking (TRACKING). Verifies idempotent ping
 * ingest, tenant scoping on every query, and that live/trail reads honour the
 * caller's TRACKING:VIEW_LIVE data scope (manager sees team, denied caller sees
 * nothing).
 */

interface PrismaMock {
  employee: { findUnique: jest.Mock };
  employeeLocation: { createMany: jest.Mock; findMany: jest.Mock };
  latestEmployeeLocation: { findMany: jest.Mock };
  $executeRaw: jest.Mock;
  $transaction: jest.Mock;
}

function makeService(opts: {
  employee?: { id: string } | null;
  scope?: ResolvedDataScope;
  createdCount?: number;
  liveRows?: unknown[];
  trailPoints?: unknown[];
}) {
  const prisma: PrismaMock = {
    employee: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          opts.employee === undefined ? { id: 'e1' } : opts.employee,
        ),
    },
    employeeLocation: {
      createMany: jest.fn().mockResolvedValue({ count: opts.createdCount ?? 0 }),
      // Trail read only (live now reads latestEmployeeLocation).
      findMany: jest.fn().mockResolvedValue(opts.trailPoints ?? []),
    },
    latestEmployeeLocation: {
      findMany: jest.fn().mockResolvedValue(opts.liveRows ?? []),
    },
    // Tagged-template raw upsert — return affected-row count.
    $executeRaw: jest.fn().mockResolvedValue(1),
    // ingestBatch passes an array of prisma promises; resolve them all so the
    // createMany count flows through unchanged.
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };
  // Real RbacService.employeeScopeWhere semantics — no need to mock its logic.
  const rbac = {
    resolveScopeIds: jest.fn().mockResolvedValue(opts.scope ?? { kind: 'ALL' }),
    employeeScopeWhere: (scope: ResolvedDataScope) => {
      if (scope.kind === 'NONE') return null;
      if (scope.kind === 'ALL') return {};
      return { employeeId: { in: [...scope.employeeIds] } };
    },
  };
  const service = new TrackingService(
    prisma as unknown as ConstructorParameters<typeof TrackingService>[0],
    rbac as unknown as RbacService,
  );
  return { service, prisma };
}

const user = { userId: 'u1', tenantId: 't1', role: 'ADMIN_MANAGER' };

const ping = (over: Record<string, unknown> = {}) => ({
  clientRef: 'c1',
  latitude: 12.9,
  longitude: 77.6,
  accuracy: 8,
  speed: 1.2,
  batteryLevel: 80,
  provider: 'gps',
  capturedAt: '2026-07-19T09:00:00.000Z',
  ...over,
});

describe('TrackingService.ingestBatch', () => {
  it('rejects a caller without an employee record', async () => {
    const { service } = makeService({ employee: null });
    await expect(
      service.ingestBatch(user, { pings: [ping()] } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('writes pings scoped to the caller tenant + employee, idempotent on clientRef', async () => {
    const { service, prisma } = makeService({ createdCount: 2 });
    const res = await service.ingestBatch(user, {
      pings: [ping(), ping({ clientRef: 'c2' })],
    } as never);

    expect(res).toEqual({ accepted: 2, received: 2 });
    const arg = prisma.employeeLocation.createMany.mock.calls[0][0];
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data[0]).toEqual(
      expect.objectContaining({
        tenantId: 't1',
        employeeId: 'e1',
        clientRef: 'c1',
        latitude: 12.9,
        longitude: 77.6,
      }),
    );
    // capturedAt coerced to a Date, not passed through as a string.
    expect(arg.data[0].capturedAt).toBeInstanceOf(Date);
    // Current-position upsert runs in the same transaction as the history write.
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('upserts the latest position from the NEWEST ping in an out-of-order batch', async () => {
    const { service, prisma } = makeService({ createdCount: 2 });
    await service.ingestBatch(user, {
      pings: [
        ping({ clientRef: 'old', capturedAt: '2026-07-19T09:00:00.000Z' }),
        ping({
          clientRef: 'new',
          latitude: 50,
          capturedAt: '2026-07-19T09:05:00.000Z',
        }),
      ],
    } as never);
    // Raw upsert params include the newest ping's latitude (50), not the older.
    const rawArgs = prisma.$executeRaw.mock.calls[0];
    expect(rawArgs).toContain(50);
  });
});

describe('TrackingService.getLive', () => {
  it('returns empty when the caller has no tracking scope (denied)', async () => {
    const { service, prisma } = makeService({ scope: { kind: 'NONE' } });
    const res = await service.getLive(user);
    expect(res).toEqual({ data: [] });
    expect(prisma.latestEmployeeLocation.findMany).not.toHaveBeenCalled();
  });

  it('reads the current-position table scoped to tenant and maps names', async () => {
    const { service, prisma } = makeService({
      liveRows: [
        {
          employeeId: 'e1',
          latitude: 1,
          longitude: 2,
          accuracy: 5,
          speed: 0,
          batteryLevel: 90,
          capturedAt: new Date('2026-07-19T09:00:00Z'),
          employee: {
            employeeCode: 'E-1',
            firstName: 'Ada',
            lastName: 'Lovelace',
          },
        },
      ],
    });
    const res = await service.getLive(user);

    const arg = prisma.latestEmployeeLocation.findMany.mock.calls[0][0];
    expect(arg.where).toEqual(expect.objectContaining({ tenantId: 't1' }));
    expect(arg.orderBy).toEqual({ capturedAt: 'desc' });
    expect(res.data[0]).toEqual(
      expect.objectContaining({ employeeId: 'e1', name: 'Ada Lovelace' }),
    );
  });

  it('restricts the where clause to scoped employee ids for a manager', async () => {
    const { service, prisma } = makeService({
      scope: { kind: 'IDS', employeeIds: ['e1', 'e2'], userIds: ['u1'] },
      liveRows: [],
    });
    await service.getLive(user);
    const arg = prisma.latestEmployeeLocation.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({
      tenantId: 't1',
      employeeId: { in: ['e1', 'e2'] },
    });
  });
});

describe('TrackingService.getTrail', () => {
  it('404s (no query) when the target operator is outside the caller scope', async () => {
    const { service, prisma } = makeService({
      scope: { kind: 'IDS', employeeIds: ['e1'], userIds: ['u1'] },
    });
    await expect(service.getTrail(user, 'e-other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // Scope rejection is in-memory — no DB round-trip for an out-of-scope id.
    expect(prisma.employeeLocation.findMany).not.toHaveBeenCalled();
  });

  it('returns ordered, time-bounded points for a visible operator', async () => {
    const { service, prisma } = makeService({
      trailPoints: [
        {
          latitude: 1,
          longitude: 2,
          accuracy: 5,
          speed: 0,
          capturedAt: new Date(),
        },
      ],
    });
    const res = await service.getTrail(
      user,
      'e1',
      '2026-07-19T08:00:00Z',
      '2026-07-19T10:00:00Z',
    );
    const arg = prisma.employeeLocation.findMany.mock.calls[0][0];
    expect(arg.where).toEqual(
      expect.objectContaining({ tenantId: 't1', employeeId: 'e1' }),
    );
    expect(arg.where.capturedAt.gte).toBeInstanceOf(Date);
    expect(arg.where.capturedAt.lte).toBeInstanceOf(Date);
    expect(arg.orderBy).toEqual({ capturedAt: 'asc' });
    expect(res.employeeId).toBe('e1');
    expect(res.truncated).toBe(false);
  });
});
