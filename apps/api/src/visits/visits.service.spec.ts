import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import { VisitAssignedEvent, VisitStatusChangedEvent } from './events/impl';
import { VisitState } from './domain/visit-state';

/**
 * VisitsService behaviour beyond the pure state machine
 * (3.2_GPSVisitManagement/VISIT_MANAGEMENT.md §6, §7, §9): tenant scoping,
 * assignee-only actions, the one-active-visit rule, GPS capture and the
 * events published after commit.
 */

const T = 'tenant-1';
const ACTOR = { userId: 'user-1' };

function visitRow(over: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    tenantId: T,
    visitNumber: 'V-1',
    purpose: 'Install router',
    status: VisitState.ACCEPTED,
    employeeId: 'emp-1',
    geofenceId: 'geo-1',
    createdBy: 'manager-1',
    actualStartAt: null,
    deletedAt: null,
    ...over,
  };
}

function makeService() {
  const prisma = {
    visit: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    visitStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    visitNote: { create: jest.fn(), findMany: jest.fn() },
    employee: { findFirst: jest.fn() },
    customer: { findFirst: jest.fn() },
    geofence: { findFirst: jest.fn() },
    gpsValidationLog: { create: jest.fn().mockResolvedValue({}) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  };
  // Interactive transactions run the callback against the same mock client.
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) =>
    fn(prisma),
  );
  const eventBus = { publish: jest.fn() };
  const rbac = { resolveScopeIds: jest.fn() };
  const service = new VisitsService(
    prisma as unknown as ConstructorParameters<typeof VisitsService>[0],
    eventBus as unknown as ConstructorParameters<typeof VisitsService>[1],
    rbac as unknown as ConstructorParameters<typeof VisitsService>[2],
  );
  return { service, prisma, eventBus, rbac };
}

/** Wires visit.findFirst: 1st call = the visit, 2nd = active-visit lookup. */
function arrangeTransition(
  prisma: ReturnType<typeof makeService>['prisma'],
  visit: ReturnType<typeof visitRow> | null,
  opts: {
    assigneeEmployeeId?: string | null;
    activeVisit?: object | null;
  } = {},
) {
  prisma.visit.findFirst
    .mockResolvedValueOnce(visit)
    .mockResolvedValueOnce(opts.activeVisit ?? null);
  prisma.employee.findFirst.mockResolvedValue(
    opts.assigneeEmployeeId === null
      ? null
      : { id: opts.assigneeEmployeeId ?? 'emp-1' },
  );
  prisma.visit.update.mockImplementation(
    ({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...visit, ...data }),
  );
}

describe('VisitsService — queries', () => {
  it('findAllScoped returns [] without querying when scope is NONE', async () => {
    const { service, prisma, rbac } = makeService();
    rbac.resolveScopeIds.mockResolvedValue({ kind: 'NONE' });
    await expect(service.findAllScoped(T, 'u', {})).resolves.toEqual([]);
    expect(prisma.visit.findMany).not.toHaveBeenCalled();
  });

  it('findAllScoped limits to scoped employees or creators', async () => {
    const { service, prisma, rbac } = makeService();
    rbac.resolveScopeIds.mockResolvedValue({
      kind: 'IDS',
      employeeIds: ['emp-1'],
      userIds: ['user-1'],
    });
    await service.findAllScoped(T, 'u', { status: 'STARTED' });
    const where = prisma.visit.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      tenantId: T,
      deletedAt: null,
      status: 'STARTED',
      OR: [
        { employeeId: { in: ['emp-1'] } },
        { createdBy: { in: ['user-1'] } },
      ],
    });
  });

  it('findAll caps page size at 100', async () => {
    const { service, prisma } = makeService();
    await service.findAll(T, {}, undefined, 500);
    expect(prisma.visit.findMany.mock.calls[0][0].take).toBe(100);
  });

  it('findOne 404s for another tenant or a deleted visit', async () => {
    const { service, prisma } = makeService();
    prisma.visit.findFirst.mockResolvedValue(null);
    await expect(service.findOne(T, 'v1')).rejects.toThrow(NotFoundException);
    expect(prisma.visit.findFirst.mock.calls[0][0].where).toEqual({
      id: 'v1',
      tenantId: T,
      deletedAt: null,
    });
  });

  it('findAssigned rejects users with no employee record', async () => {
    const { service, prisma } = makeService();
    prisma.employee.findFirst.mockResolvedValue(null);
    await expect(service.findAssigned(T, 'u')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('VisitsService — create / update', () => {
  const dto = {
    purpose: 'Install router',
    plannedStartAt: '2026-11-20T09:00:00.000Z',
  };

  it('creates PLANNED without an employee and publishes nothing', async () => {
    const { service, prisma, eventBus } = makeService();
    prisma.visit.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'v1', ...data }),
    );
    const created = await service.create(T, ACTOR, dto as never);
    expect(created.status).toBe(VisitState.PLANNED);
    expect(prisma.visitStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: null,
        toStatus: VisitState.PLANNED,
      }),
    });
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('creates ASSIGNED with an employee and publishes VisitAssignedEvent', async () => {
    const { service, prisma, eventBus } = makeService();
    prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' });
    prisma.visit.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'v1', ...data }),
    );
    const created = await service.create(T, ACTOR, {
      ...dto,
      employeeId: 'emp-1',
    } as never);
    expect(created.status).toBe(VisitState.ASSIGNED);
    expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(
      VisitAssignedEvent,
    );
  });

  it('rejects references that are outside the tenant', async () => {
    const { service, prisma } = makeService();
    prisma.customer.findFirst.mockResolvedValue(null);
    await expect(
      service.create(T, ACTOR, { ...dto, customerId: 'c-other' } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.customer.findFirst.mock.calls[0][0].where).toEqual({
      id: 'c-other',
      tenantId: T,
      deletedAt: null,
    });
    expect(prisma.visit.create).not.toHaveBeenCalled();
  });

  it('refuses to edit a read-only (completed) visit', async () => {
    const { service, prisma } = makeService();
    prisma.visit.findFirst.mockResolvedValue(
      visitRow({ status: VisitState.COMPLETED }),
    );
    await expect(
      service.update(T, 'v1', ACTOR, { purpose: 'x' } as never),
    ).rejects.toThrow(ConflictException);
    expect(prisma.visit.update).not.toHaveBeenCalled();
  });
});

describe('VisitsService — transitions', () => {
  it('404s on a deleted / foreign visit before any write', async () => {
    const { service, prisma } = makeService();
    arrangeTransition(prisma, null);
    await expect(service.start(T, 'v1', ACTOR, {})).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.visit.update).not.toHaveBeenCalled();
  });

  it('rejects an invalid transition (PLANNED → STARTED)', async () => {
    const { service, prisma } = makeService();
    arrangeTransition(prisma, visitRow({ status: VisitState.PLANNED }));
    await expect(service.start(T, 'v1', ACTOR, {})).rejects.toThrow();
    expect(prisma.visit.update).not.toHaveBeenCalled();
  });

  it('only the assigned employee can start', async () => {
    const { service, prisma } = makeService();
    arrangeTransition(prisma, visitRow(), { assigneeEmployeeId: 'emp-2' });
    await expect(service.start(T, 'v1', ACTOR, {})).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.visit.update).not.toHaveBeenCalled();
  });

  it('blocks starting while another visit is active (one-active rule)', async () => {
    const { service, prisma } = makeService();
    arrangeTransition(prisma, visitRow(), {
      activeVisit: { id: 'v2', visitNumber: 'V-2' },
    });
    await expect(service.start(T, 'v1', ACTOR, {})).rejects.toThrow(/V-2/);
    const activeWhere = prisma.visit.findFirst.mock.calls[1][0].where;
    expect(activeWhere).toMatchObject({
      tenantId: T,
      employeeId: 'emp-1',
      id: { not: 'v1' },
      deletedAt: null,
    });
  });

  it('start inside the geofence stamps start time, GPS and gpsValidated', async () => {
    const { service, prisma, eventBus } = makeService();
    arrangeTransition(prisma, visitRow());
    prisma.$queryRaw.mockResolvedValue([{ id: 'geo-1' }]);
    const updated = await service.start(T, 'v1', ACTOR, {
      latitude: 13.08,
      longitude: 80.27,
    });
    expect(updated).toMatchObject({
      status: VisitState.STARTED,
      startLatitude: 13.08,
      startLongitude: 80.27,
      gpsValidated: true,
    });
    expect(updated.actualStartAt).toBeInstanceOf(Date);
    expect(prisma.gpsValidationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: 'VALID', employeeId: 'emp-1' }),
    });
    expect(eventBus.publish.mock.calls[0][0]).toBeInstanceOf(
      VisitStatusChangedEvent,
    );
  });

  it('start outside the geofence still starts but logs OUTSIDE_GEOFENCE', async () => {
    const { service, prisma } = makeService();
    arrangeTransition(prisma, visitRow());
    prisma.$queryRaw.mockResolvedValue([]);
    const updated = await service.start(T, 'v1', ACTOR, {
      latitude: 1,
      longitude: 1,
    });
    expect(updated.gpsValidated).toBe(false);
    expect(prisma.gpsValidationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: 'OUTSIDE_GEOFENCE' }),
    });
  });

  it('resume from PAUSED skips the one-active check and keeps actualStartAt', async () => {
    const { service, prisma } = makeService();
    const startedAt = new Date('2026-11-19T08:00:00Z');
    arrangeTransition(
      prisma,
      visitRow({ status: VisitState.PAUSED, actualStartAt: startedAt }),
    );
    const updated = await service.resume(T, 'v1', ACTOR, {});
    expect(prisma.visit.findFirst).toHaveBeenCalledTimes(1);
    expect(updated.status).toBe(VisitState.STARTED);
    // The original start time survives a pause/resume cycle.
    expect(updated.actualStartAt).toBe(startedAt);
    expect(prisma.visit.update.mock.calls[0][0].data).not.toHaveProperty(
      'actualStartAt',
    );
  });

  it('complete stamps actualEndAt, end GPS and outcome', async () => {
    const { service, prisma } = makeService();
    arrangeTransition(prisma, visitRow({ status: VisitState.STARTED }));
    const updated = await service.complete(T, 'v1', ACTOR, {
      outcome: 'INSTALLED',
      latitude: 2,
      longitude: 3,
    } as never);
    expect(updated).toMatchObject({
      status: VisitState.COMPLETED,
      outcome: 'INSTALLED',
      endLatitude: 2,
      endLongitude: 3,
    });
    expect(updated.actualEndAt).toBeInstanceOf(Date);
  });

  it('writes an immutable history row with clientRef for offline replays', async () => {
    const { service, prisma } = makeService();
    arrangeTransition(prisma, visitRow({ status: VisitState.STARTED }));
    await service.transition(T, 'v1', ACTOR, VisitState.PAUSED, {
      clientRef: 'dev-123',
      assigneeOnly: true,
    });
    expect(prisma.visitStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: T,
        visitId: 'v1',
        fromStatus: VisitState.STARTED,
        toStatus: VisitState.PAUSED,
        clientRef: 'dev-123',
        createdBy: 'user-1',
      }),
    });
  });

  it('assign rejects an employee from another tenant', async () => {
    const { service, prisma } = makeService();
    prisma.employee.findFirst.mockResolvedValue(null);
    await expect(
      service.assign(T, 'v1', ACTOR, { employeeId: 'emp-x' } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
