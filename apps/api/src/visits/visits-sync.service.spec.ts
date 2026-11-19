import { ConflictException } from '@nestjs/common';
import { VisitsSyncService } from './visits-sync.service';
import { VisitState } from './domain/visit-state';

/** Offline visit-action ingestion (3.2 OFFLINE_SYNC.md). */

const T = 'tenant-1';
const ACTOR = { userId: 'user-1' };

function makeService() {
  const prisma = {
    visitStatusHistory: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const visits = { transition: jest.fn().mockResolvedValue({}) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new VisitsSyncService(
    prisma as unknown as ConstructorParameters<typeof VisitsSyncService>[0],
    visits as unknown as ConstructorParameters<typeof VisitsSyncService>[1],
    audit as unknown as ConstructorParameters<typeof VisitsSyncService>[2],
  );
  return { service, prisma, visits, audit };
}

const action = (
  clientRef: string,
  act: string,
  timestamp: string,
  extra: Record<string, unknown> = {},
) => ({ clientRef, visitId: 'v1', action: act, timestamp, ...extra });

describe('VisitsSyncService', () => {
  it('applies actions in device capture order, not arrival order', async () => {
    const { service, visits } = makeService();
    await service.syncActions(T, ACTOR, {
      actions: [
        action('c2', 'PAUSE', '2026-11-19T10:05:00Z'),
        action('c1', 'START', '2026-11-19T10:00:00Z'),
      ],
    } as never);
    expect(visits.transition.mock.calls.map((c) => c[3])).toEqual([
      VisitState.STARTED,
      VisitState.PAUSED,
    ]);
  });

  it('passes device time, GPS, clientRef and assignee-only to the transition', async () => {
    const { service, visits } = makeService();
    await service.syncActions(T, ACTOR, {
      actions: [
        action('c1', 'START', '2026-11-19T10:00:00Z', {
          latitude: 13,
          longitude: 80,
        }),
      ],
    } as never);
    expect(visits.transition).toHaveBeenCalledWith(
      T,
      'v1',
      ACTOR,
      VisitState.STARTED,
      expect.objectContaining({
        clientRef: 'c1',
        latitude: 13,
        longitude: 80,
        at: new Date('2026-11-19T10:00:00Z'),
        assigneeOnly: true,
      }),
    );
  });

  it('reports a replayed clientRef as DUPLICATE without applying it', async () => {
    const { service, prisma, visits } = makeService();
    prisma.visitStatusHistory.findFirst.mockResolvedValue({ id: 'h1' });
    const { results } = await service.syncActions(T, ACTOR, {
      actions: [action('c1', 'START', '2026-11-19T10:00:00Z')],
    } as never);
    expect(results).toEqual([{ clientRef: 'c1', status: 'DUPLICATE' }]);
    expect(visits.transition).not.toHaveBeenCalled();
    expect(prisma.visitStatusHistory.findFirst.mock.calls[0][0].where).toEqual({
      tenantId: T,
      visitId: 'v1',
      clientRef: 'c1',
    });
  });

  it('isolates failures: one FAILED item does not stop the batch', async () => {
    const { service, visits } = makeService();
    visits.transition
      .mockRejectedValueOnce(new ConflictException('already active'))
      .mockResolvedValueOnce({});
    const { results } = await service.syncActions(T, ACTOR, {
      actions: [
        action('c1', 'START', '2026-11-19T10:00:00Z'),
        action('c2', 'PAUSE', '2026-11-19T10:05:00Z'),
      ],
    } as never);
    expect(results).toEqual([
      { clientRef: 'c1', status: 'FAILED', error: 'already active' },
      { clientRef: 'c2', status: 'APPLIED' },
    ]);
  });

  it('defaults the outcome of an offline COMPLETE', async () => {
    const { service, visits } = makeService();
    await service.syncActions(T, ACTOR, {
      actions: [action('c1', 'COMPLETE', '2026-11-19T11:00:00Z')],
    } as never);
    expect(visits.transition.mock.calls[0][4].extraData).toEqual({
      outcome: 'COMPLETED_OFFLINE',
    });
  });

  it('audits the batch with applied / duplicate / failed counts', async () => {
    const { service, prisma, visits, audit } = makeService();
    prisma.visitStatusHistory.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'dup' })
      .mockResolvedValueOnce(null);
    visits.transition
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('bad'));
    await service.syncActions(T, ACTOR, {
      actions: [
        action('a', 'START', '2026-11-19T10:00:00Z'),
        action('b', 'PAUSE', '2026-11-19T10:01:00Z'),
        action('c', 'RESUME', '2026-11-19T10:02:00Z'),
      ],
    } as never);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: T,
        action: 'OFFLINE_SYNC',
        newValue: { received: 3, applied: 1, duplicates: 1, failed: 1 },
      }),
    );
  });
});
