import { ConflictException, NotFoundException } from '@nestjs/common';
import { FaultsRepository } from './faults.repository';
import { FaultState } from './domain/fault-state';

/**
 * Fault repository lifecycle rules that are easy to regress:
 *  - illegal status moves are rejected by the state machine, not written;
 *  - RESOLVED/CLOSED stamp their timestamps, REOPENED clears resolvedAt and
 *    bumps the reopen counter;
 *  - ON_HOLD pauses the SLA clock and resuming banks the paused minutes and
 *    pushes the deadline out by the same span;
 *  - deleting a fault is a soft delete, never a row removal;
 *  - list queries always exclude soft-deleted rows.
 */

type RepositoryArgs = ConstructorParameters<typeof FaultsRepository>;

const TENANT = 't1';
const USER = 'u1';
const FAULT_ID = 'f1';

function makeRepo(fault: Record<string, unknown> | null) {
  const tx = {
    fault: {
      findFirst: jest.fn().mockResolvedValue(fault),
      update: jest
        .fn()
        .mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({ id: FAULT_ID, faultNumber: 'PF-1', ...data }),
        ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ id: FAULT_ID, faultNumber: 'PF-1' }),
        ),
    },
    faultTimeline: { create: jest.fn().mockResolvedValue({}) },
  };

  const delegate = {
    findFirst: jest.fn().mockResolvedValue(fault),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({ id: FAULT_ID }),
  };

  const prisma = {
    fault: delegate,
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (transaction: typeof tx) => unknown)(tx)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };

  const repo = new FaultsRepository(prisma as unknown as RepositoryArgs[0]);
  return { repo, tx, delegate, prisma };
}

describe('FaultsRepository.updateStatus', () => {
  it('applies write scope to both the transaction lookup and atomic update', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.IN_PROGRESS,
    });
    const scopeWhere = { OR: [{ assignedToId: USER }, { createdBy: USER }] };

    await repo.updateStatus(
      TENANT,
      FAULT_ID,
      USER,
      FaultState.RESOLVED,
      'fixed',
      undefined,
      scopeWhere,
    );

    expect(tx.fault.findFirst.mock.calls[0][0].where).toMatchObject(scopeWhere);
    expect(tx.fault.updateMany.mock.calls[0][0].where).toMatchObject(
      scopeWhere,
    );
  });
  it('rejects an illegal transition without writing', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.OPEN,
      slaPausedMinutes: 0,
    });

    await expect(
      repo.updateStatus(TENANT, FAULT_ID, USER, FaultState.RESOLVED, 'done'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.fault.update).not.toHaveBeenCalled();
    expect(tx.faultTimeline.create).not.toHaveBeenCalled();
  });

  it('404s on a fault outside the tenant', async () => {
    const { repo } = makeRepo(null);

    await expect(
      repo.updateStatus(TENANT, FAULT_ID, USER, FaultState.ASSIGNED, 'x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires an assignee before active work starts', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.OPEN,
      assignedToId: null,
      slaPausedMinutes: 0,
    });

    await expect(
      repo.updateStatus(
        TENANT,
        FAULT_ID,
        USER,
        FaultState.IN_PROGRESS,
        'starting',
      ),
    ).rejects.toThrow('Assign a technician');
    expect(tx.fault.updateMany).not.toHaveBeenCalled();
  });

  it('stamps resolvedAt on RESOLVED', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.IN_PROGRESS,
      slaPausedMinutes: 0,
    });

    await repo.updateStatus(
      TENANT,
      FAULT_ID,
      USER,
      FaultState.RESOLVED,
      'fixed',
    );

    const data = tx.fault.updateMany.mock.calls[0][0].data;
    expect(data.status).toBe(FaultState.RESOLVED);
    expect(data.resolvedAt).toBeInstanceOf(Date);
    expect(data.closedAt).toBeUndefined();
  });

  it('clears resolvedAt and bumps reopenCount on REOPENED', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.RESOLVED,
      slaPausedMinutes: 0,
    });

    await repo.updateStatus(
      TENANT,
      FAULT_ID,
      USER,
      FaultState.REOPENED,
      'still broken',
    );

    const data = tx.fault.updateMany.mock.calls[0][0].data;
    expect(data.resolvedAt).toBeNull();
    expect(data.reopenCount).toEqual({ increment: 1 });
  });

  it('pauses the SLA clock on ON_HOLD', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.IN_PROGRESS,
      slaPausedMinutes: 0,
    });

    await repo.updateStatus(
      TENANT,
      FAULT_ID,
      USER,
      FaultState.ON_HOLD,
      'waiting on customer',
    );

    const data = tx.fault.updateMany.mock.calls[0][0].data;
    expect(data.slaPausedAt).toBeInstanceOf(Date);
  });

  it('banks paused minutes and extends the deadline on resume', async () => {
    const pausedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    const deadline = new Date(Date.now() + 60 * 60 * 1000);
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.ON_HOLD,
      assignedToId: 'tech-1',
      slaPausedAt: pausedAt,
      slaPausedMinutes: 15,
      slaDeadline: deadline,
    });

    await repo.updateStatus(
      TENANT,
      FAULT_ID,
      USER,
      FaultState.IN_PROGRESS,
      'customer responded',
    );

    const data = tx.fault.updateMany.mock.calls[0][0].data;
    expect(data.slaPausedAt).toBeNull();
    // 15 already banked + ~30 from this hold
    expect(data.slaPausedMinutes).toBeGreaterThanOrEqual(44);
    expect(data.slaPausedMinutes).toBeLessThanOrEqual(46);
    expect((data.slaDeadline as Date).getTime()).toBeGreaterThan(
      deadline.getTime(),
    );
  });

  it('writes a timeline entry for every accepted change', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.OPEN,
      assignedToId: 'tech-1',
      slaPausedMinutes: 0,
    });

    await repo.updateStatus(
      TENANT,
      FAULT_ID,
      USER,
      FaultState.ASSIGNED,
      'picked up',
      'client-ref-1',
    );

    expect(tx.faultTimeline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TENANT,
        status: FaultState.ASSIGNED,
        notes: 'picked up',
        clientRef: 'client-ref-1',
        createdBy: USER,
      }),
    });
  });

  it('rejects a stale concurrent transition before writing its timeline', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.IN_PROGRESS,
      slaPausedMinutes: 0,
    });
    tx.fault.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repo.updateStatus(TENANT, FAULT_ID, USER, FaultState.RESOLVED, 'fixed'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.faultTimeline.create).not.toHaveBeenCalled();
  });
});

describe('FaultsRepository.assignFault', () => {
  it('returns an assigned fault to OPEN when it is unassigned', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.ASSIGNED,
    });
    await repo.assignFault(TENANT, FAULT_ID, USER, null);
    expect(tx.fault.update.mock.calls[0][0].data).toMatchObject({
      assignedToId: null,
      status: FaultState.OPEN,
    });
  });

  it('requires reassignment rather than leaving in-flight work without an owner', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.IN_PROGRESS,
    });
    await expect(
      repo.assignFault(TENANT, FAULT_ID, USER, null),
    ).rejects.toThrow('Reassign in-flight work');
    expect(tx.fault.update).not.toHaveBeenCalled();
  });
  it('moves an OPEN fault to ASSIGNED', async () => {
    const { repo, tx } = makeRepo({ id: FAULT_ID, status: FaultState.OPEN });

    await repo.assignFault(TENANT, FAULT_ID, USER, 'tech-1');

    expect(tx.fault.update.mock.calls[0][0].data).toMatchObject({
      assignedToId: 'tech-1',
      status: FaultState.ASSIGNED,
    });
  });

  it('keeps in-flight work in its current state on reassignment', async () => {
    const { repo, tx } = makeRepo({
      id: FAULT_ID,
      status: FaultState.IN_PROGRESS,
    });

    await repo.assignFault(TENANT, FAULT_ID, USER, 'tech-2');

    expect(tx.fault.update.mock.calls[0][0].data.status).toBe(
      FaultState.IN_PROGRESS,
    );
  });

  it('refuses to assign a closed fault', async () => {
    const { repo } = makeRepo({ id: FAULT_ID, status: FaultState.CLOSED });

    await expect(
      repo.assignFault(TENANT, FAULT_ID, USER, 'tech-1'),
    ).rejects.toThrow('Cannot assign a closed fault');
  });
});

describe('FaultsRepository soft delete and scoping', () => {
  it('soft-deletes instead of removing the row', async () => {
    const { repo, delegate } = makeRepo({ id: FAULT_ID, status: 'OPEN' });

    await repo.delete(TENANT, FAULT_ID);

    expect(delegate.update).toHaveBeenCalledWith({
      where: {
        id_tenantId: { id: FAULT_ID, tenantId: TENANT },
        deletedAt: null,
      },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('excludes soft-deleted faults from the paginated list', async () => {
    const { repo, delegate } = makeRepo(null);

    await repo.findAllPaginated(TENANT, {});

    expect(delegate.findMany.mock.calls[0][0].where).toMatchObject({
      tenantId: TENANT,
      deletedAt: null,
    });
  });

  it('applies status, search and unassigned filters', async () => {
    const { repo, delegate } = makeRepo(null);

    await repo.findAllPaginated(TENANT, {
      status: [FaultState.OPEN, FaultState.ASSIGNED],
      unassigned: true,
      q: 'router',
    });

    const where = delegate.findMany.mock.calls[0][0].where;
    expect(where.status).toEqual({
      in: [FaultState.OPEN, FaultState.ASSIGNED],
    });
    expect(where.assignedToId).toBeNull();
    expect(where.OR).toEqual([
      { faultNumber: { contains: 'router', mode: 'insensitive' } },
      { title: { contains: 'router', mode: 'insensitive' } },
    ]);
  });
});
