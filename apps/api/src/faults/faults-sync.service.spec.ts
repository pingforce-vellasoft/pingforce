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
  };
  const commandBus = {
    execute: jest.fn().mockResolvedValue({ id: 'fault-1' }),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const faultAccess = { scopeForAction: jest.fn().mockResolvedValue({}) };
  return {
    service: new FaultsSyncService(
      prisma as unknown as ServiceArgs[0],
      commandBus as unknown as ServiceArgs[1],
      audit as unknown as ServiceArgs[2],
      faultAccess as unknown as ServiceArgs[3],
    ),
    prisma,
    commandBus,
    faultAccess,
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
