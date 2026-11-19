import { FaultState } from './domain/fault-state';
import { FaultsSyncService } from './faults-sync.service';
import { CreateFaultCommand } from './commands/impl';

type ServiceArgs = ConstructorParameters<typeof FaultsSyncService>;

const actor = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  email: 'tech@example.com',
  roleCode: 'EMPLOYEE',
};

function makeService() {
  const prisma = {
    fault: {
      findFirst: jest
        .fn()
        .mockImplementation(({ where }: { where: { id?: string } }) =>
          Promise.resolve(where.id ? { id: where.id } : null),
        ),
    },
    faultTimeline: { findFirst: jest.fn().mockResolvedValue(null) },
    faultAttempt: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const commandBus = {
    execute: jest.fn().mockResolvedValue({ id: 'fault-1' }),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const faultAccess = { scopeForAction: jest.fn().mockResolvedValue({}) };
  const faultAttempts = {
    create: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
  };
  return {
    service: new FaultsSyncService(
      prisma as unknown as ServiceArgs[0],
      commandBus as unknown as ServiceArgs[1],
      audit as unknown as ServiceArgs[2],
      faultAccess as unknown as ServiceArgs[3],
      faultAttempts as unknown as ServiceArgs[4],
    ),
    prisma,
    commandBus,
    faultAccess,
    faultAttempts,
  };
}

describe('FaultsSyncService', () => {
  it('returns an existing create as a duplicate', async () => {
    const { service, prisma, commandBus } = makeService();
    prisma.fault.findFirst.mockResolvedValue({ id: 'fault-existing' });

    const result = await service.syncActions('tenant-1', actor, {
      actions: [
        {
          clientRef: 'create-1',
          action: 'CREATE',
          timestamp: '2026-09-14T10:00:00.000Z',
          faultNumber: 'PF-OFFLINE-1',
          title: 'No signal',
          description: 'ONT offline',
        },
      ],
    });

    expect(result.results[0]).toEqual({
      clientRef: 'create-1',
      status: 'DUPLICATE',
      faultId: 'fault-existing',
    });
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('assigns a newly synced field fault to its technician', async () => {
    const { service, commandBus } = makeService();

    await service.syncActions('tenant-1', actor, {
      actions: [
        {
          clientRef: 'create-2',
          action: 'CREATE',
          timestamp: '2026-09-14T10:00:00.000Z',
          faultNumber: 'PF-OFFLINE-2',
          title: 'Low optical power',
          description: 'Reading is below the accepted threshold',
        },
      ],
    });

    const command = commandBus.execute.mock.calls[0][0] as CreateFaultCommand;
    expect(command.createFaultDto.assignToSelf).toBe(true);
  });

  it('deduplicates a previously applied status client reference', async () => {
    const { service, prisma, commandBus } = makeService();
    prisma.faultTimeline.findFirst.mockResolvedValue({ id: 'timeline-1' });

    const result = await service.syncActions('tenant-1', actor, {
      actions: [
        {
          clientRef: 'status-1',
          action: 'UPDATE_STATUS',
          timestamp: '2026-09-14T10:00:00.000Z',
          faultId: '11111111-1111-4111-8111-111111111111',
          status: FaultState.IN_PROGRESS,
        },
      ],
    });

    expect(result.results[0].status).toBe('DUPLICATE');
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('treats a database unique race as a duplicate', async () => {
    const { service, commandBus } = makeService();
    commandBus.execute.mockRejectedValue({ code: 'P2002' });

    const result = await service.syncActions('tenant-1', actor, {
      actions: [
        {
          clientRef: 'status-race',
          action: 'UPDATE_STATUS',
          timestamp: '2026-09-14T10:00:00.000Z',
          faultId: '11111111-1111-4111-8111-111111111111',
          status: FaultState.IN_PROGRESS,
        },
      ],
    });

    expect(result.results[0].status).toBe('DUPLICATE');
  });

  it('fails a terminal transition without its required note', async () => {
    const { service, commandBus } = makeService();

    const result = await service.syncActions('tenant-1', actor, {
      actions: [
        {
          clientRef: 'resolve-1',
          action: 'UPDATE_STATUS',
          timestamp: '2026-09-14T10:00:00.000Z',
          faultId: '11111111-1111-4111-8111-111111111111',
          status: FaultState.RESOLVED,
        },
      ],
    });

    expect(result.results[0].status).toBe('FAILED');
    expect(result.results[0].error).toContain('required');
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('rejects status replay for a fault outside the caller write scope', async () => {
    const { service, prisma, commandBus, faultAccess } = makeService();
    faultAccess.scopeForAction.mockResolvedValue({ createdBy: actor.userId });
    prisma.fault.findFirst.mockResolvedValue(null);

    const result = await service.syncActions('tenant-1', actor, {
      actions: [
        {
          clientRef: 'outside-scope',
          action: 'UPDATE_STATUS',
          timestamp: '2026-09-14T10:00:00.000Z',
          faultId: '11111111-1111-4111-8111-111111111111',
          status: FaultState.IN_PROGRESS,
        },
      ],
    });

    expect(result.results[0].status).toBe('FAILED');
    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(prisma.faultTimeline.findFirst).not.toHaveBeenCalled();
  });
});

describe('FaultsSyncService ADD_ATTEMPT', () => {
  const attemptItem = {
    clientRef: 'att-1',
    action: 'ADD_ATTEMPT' as const,
    timestamp: '2026-11-19T09:00:00.000Z',
    faultId: 'fault-1',
    attempt: {
      attemptType: 'INITIAL_VISIT' as const,
      outcome: 'REVISIT_REQUIRED' as const,
      startedAt: '2026-11-19T08:00:00.000Z',
    },
  };

  it('records the attempt with the sync clientRef', async () => {
    const { service, faultAttempts } = makeService();
    const { results } = await service.syncActions('tenant-1', actor, {
      actions: [attemptItem],
    });
    expect(results).toEqual([
      { clientRef: 'att-1', status: 'APPLIED', faultId: 'fault-1' },
    ]);
    expect(faultAttempts.create).toHaveBeenCalledWith(
      'tenant-1',
      'fault-1',
      'user-1',
      expect.objectContaining({
        clientRef: 'att-1',
        outcome: 'REVISIT_REQUIRED',
      }),
    );
  });

  it('reports a replayed attempt as a duplicate without writing', async () => {
    const { service, prisma, faultAttempts } = makeService();
    prisma.faultAttempt.findFirst.mockResolvedValue({ id: 'attempt-1' });
    const { results } = await service.syncActions('tenant-1', actor, {
      actions: [attemptItem],
    });
    expect(results[0].status).toBe('DUPLICATE');
    expect(faultAttempts.create).not.toHaveBeenCalled();
  });

  it('fails the item when the attempt is missing, and keeps going', async () => {
    const { service } = makeService();
    const { results } = await service.syncActions('tenant-1', actor, {
      actions: [
        { ...attemptItem, attempt: undefined },
        {
          ...attemptItem,
          clientRef: 'att-2',
          timestamp: '2026-11-19T10:00:00.000Z',
        },
      ],
    });
    expect(results.map((r) => r.status)).toEqual(['FAILED', 'APPLIED']);
  });

  it('surfaces attempt rule failures (e.g. resolved fault) as FAILED', async () => {
    const { service, faultAttempts } = makeService();
    faultAttempts.create.mockRejectedValue(
      new Error(
        'Fault is RESOLVED; reopen it before recording another attempt',
      ),
    );
    const { results } = await service.syncActions('tenant-1', actor, {
      actions: [attemptItem],
    });
    expect(results[0]).toMatchObject({
      status: 'FAILED',
      error: expect.stringContaining('RESOLVED'),
    });
  });
});
