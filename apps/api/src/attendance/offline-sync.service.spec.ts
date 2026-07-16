import { OfflineSyncService } from './offline-sync.service';

/**
 * Offline punch sync idempotency (OFFLINE_SYNC.md §6-§9): retried uploads
 * must never double-punch, untrusted devices are rejected per item.
 */

interface TxMock {
  attendanceSession: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  attendance: { findFirst: jest.Mock; create: jest.Mock };
}

function makeService(opts: {
  trustedDevices?: string[];
  nearDuplicate?: boolean;
  openSession?: { id: string; punchIn: Date; sessionStatus: string } | null;
}) {
  const tx: TxMock = {
    attendanceSession: {
      // First findFirst = near-duplicate probe, second = open-session probe
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(opts.nearDuplicate ? { id: 'dup' } : null)
        .mockResolvedValueOnce(opts.openSession ?? null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    attendance: {
      findFirst: jest.fn().mockResolvedValue({ id: 'att1' }),
      create: jest.fn().mockResolvedValue({ id: 'att1' }),
    },
  };
  const prisma = {
    employee: {
      findUnique: jest.fn().mockResolvedValue({ id: 'e1', tenantId: 't1' }),
    },
    employeeDevice: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          (opts.trustedDevices ?? ['d1']).map((deviceId) => ({
            deviceId,
            isTrusted: true,
          })),
        ),
    },
    $transaction: jest.fn(
      async (cb: (t: TxMock) => Promise<unknown>) => cb(tx),
    ),
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new OfflineSyncService(
    prisma as unknown as ConstructorParameters<typeof OfflineSyncService>[0],
    auditService as unknown as ConstructorParameters<
      typeof OfflineSyncService
    >[1],
  );
  return { service, tx };
}

const user = { userId: 'u1', tenantId: 't1' };
const punch = (over: Partial<Record<string, unknown>> = {}) => ({
  clientRef: 'c1',
  deviceId: 'd1',
  timestamp: '2026-07-15T09:00:00.000Z',
  latitude: 1,
  longitude: 2,
  signature: 'sig-1',
  ...over,
});

describe('OfflineSyncService.syncPunches', () => {
  it('rejects punches from untrusted devices', async () => {
    const { service } = makeService({ trustedDevices: [] });
    const { results } = await service.syncPunches(user, {
      punches: [punch()],
    } as never);
    expect(results).toEqual([
      { clientRef: 'c1', status: 'FAILED', error: 'Untrusted device' },
    ]);
  });

  it('reports DUPLICATE for retransmitted/near-duplicate punches (idempotency)', async () => {
    const { service, tx } = makeService({ nearDuplicate: true });
    const { results } = await service.syncPunches(user, {
      punches: [punch()],
    } as never);
    expect(results).toEqual([{ clientRef: 'c1', status: 'DUPLICATE' }]);
    expect(tx.attendanceSession.create).not.toHaveBeenCalled();
    expect(tx.attendanceSession.update).not.toHaveBeenCalled();
  });

  it('applies a fresh punch as a new CHECKED_IN session', async () => {
    const { service, tx } = makeService({});
    const { results } = await service.syncPunches(user, {
      punches: [punch()],
    } as never);
    expect(results).toEqual([{ clientRef: 'c1', status: 'APPLIED' }]);
    expect(tx.attendanceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionStatus: 'CHECKED_IN',
          deviceSignature: 'sig-1',
        }),
      }),
    );
  });

  it('closes an open session when a later punch arrives', async () => {
    const { service, tx } = makeService({
      openSession: {
        id: 's-open',
        punchIn: new Date('2026-07-15T08:00:00.000Z'),
        sessionStatus: 'CHECKED_IN',
      },
    });
    const { results } = await service.syncPunches(user, {
      punches: [punch()],
    } as never);
    expect(results).toEqual([{ clientRef: 'c1', status: 'APPLIED' }]);
    expect(tx.attendanceSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's-open' },
        data: expect.objectContaining({ sessionStatus: 'CHECKED_OUT' }),
      }),
    );
    expect(tx.attendanceSession.create).not.toHaveBeenCalled();
  });
});
