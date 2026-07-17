import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ServiceRequestsService } from './service-requests.service';

/**
 * Service-request engine invariants (3.8_CustomerPortal P4, spec §4.2/§9.2):
 * - policy routing: AUTO → APPROVED, APPROVAL/no-row → UNDER_REVIEW,
 *   AUTO_WITH_LIMITS honors the yearly suspension cap
 * - PLAN_CHANGE classifies upgrade vs downgrade by price so the right policy
 *   row applies
 * - cross-account connection access is rejected (BR-9.2)
 * - staff transitions obey the state machine
 */

const CONNECTION = { id: 'conn1', servicePlanId: 'planA' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeService(over: any = {}) {
  const created: { data?: Record<string, unknown> } = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = {
    serviceRequest: {
      count: jest.fn().mockResolvedValue(over.openCount ?? 0),
      create: jest
        .fn()
        .mockImplementation((args: { data: Record<string, unknown> }) => {
          created.data = args.data;
          return Promise.resolve({
            id: 'sr1',
            requestNumber: 'SR-X',
            ...args.data,
          });
        }),
      findFirst: jest.fn().mockResolvedValue(over.existingSr ?? null),
      findMany: jest.fn().mockResolvedValue(over.priorSuspensions ?? []),
      update: jest.fn().mockResolvedValue({ id: 'sr1' }),
    },
    serviceRequestTimeline: { create: jest.fn().mockResolvedValue({}) },
    serviceRequestPolicy: {
      findFirst: jest.fn().mockResolvedValue(over.policy ?? null),
    },
    servicePlan: {
      findFirst: jest
        .fn()
        .mockImplementation((args: { where: { id: string } }) => {
          const plans: Record<string, unknown> = {
            planA: { id: 'planA', price: 600 },
            planUp: { id: 'planUp', price: 900 },
            planDown: { id: 'planDown', price: 300 },
          };
          return Promise.resolve(plans[args.where.id] ?? null);
        }),
    },
    addOn: { findFirst: jest.fn().mockResolvedValue({ id: 'addon1' }) },
    networkConnection: {
      findFirst: jest
        .fn()
        .mockResolvedValue('connection' in over ? over.connection : CONNECTION),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const service = new ServiceRequestsService(
    prisma as unknown as ConstructorParameters<
      typeof ServiceRequestsService
    >[0],
    audit as unknown as ConstructorParameters<typeof ServiceRequestsService>[1],
  );
  return { service, prisma, created };
}

describe('ServiceRequestsService — policy routing', () => {
  it('AUTO policy approves immediately', async () => {
    const { service, created } = makeService({
      policy: { mode: 'AUTO', limits: null },
    });
    const sr = await service.submit('t1', 'c1', 'pu1', {
      type: 'ADDON_ADD',
      connectionId: 'conn1',
      payload: { addOnId: 'addon1' },
    });
    expect(sr.status).toBe('APPROVED');
    expect(created.data?.status).toBe('APPROVED');
  });

  it('no policy row defaults to UNDER_REVIEW (fail-safe)', async () => {
    const { service } = makeService({ policy: null });
    const sr = await service.submit('t1', 'c1', 'pu1', {
      type: 'ADDON_ADD',
      connectionId: 'conn1',
      payload: { addOnId: 'addon1' },
    });
    expect(sr.status).toBe('UNDER_REVIEW');
  });

  it('classifies a cheaper target plan as DOWNGRADE and reads that policy row', async () => {
    const { service, prisma } = makeService({ policy: { mode: 'APPROVAL' } });
    await service.submit('t1', 'c1', 'pu1', {
      type: 'PLAN_CHANGE',
      connectionId: 'conn1',
      payload: { targetPlanId: 'planDown' },
    });
    expect(prisma.serviceRequestPolicy.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requestType: 'PLAN_CHANGE_DOWNGRADE',
        }),
      }),
    );
  });

  it('classifies a pricier target plan as UPGRADE', async () => {
    const { service, prisma } = makeService({ policy: { mode: 'APPROVAL' } });
    await service.submit('t1', 'c1', 'pu1', {
      type: 'PLAN_CHANGE',
      connectionId: 'conn1',
      payload: { targetPlanId: 'planUp' },
    });
    expect(prisma.serviceRequestPolicy.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requestType: 'PLAN_CHANGE_UPGRADE' }),
      }),
    );
  });

  it('AUTO_WITH_LIMITS approves suspension within the yearly cap', async () => {
    const { service } = makeService({
      policy: {
        mode: 'AUTO_WITH_LIMITS',
        limits: { maxSuspensionDaysPerYear: 30 },
      },
      priorSuspensions: [{ payload: { days: 10 } }],
    });
    const sr = await service.submit('t1', 'c1', 'pu1', {
      type: 'SUSPENSION',
      payload: { days: 15 },
    });
    expect(sr.status).toBe('APPROVED'); // 10 + 15 <= 30
  });

  it('AUTO_WITH_LIMITS routes to review when the cap is exceeded', async () => {
    const { service } = makeService({
      policy: {
        mode: 'AUTO_WITH_LIMITS',
        limits: { maxSuspensionDaysPerYear: 30 },
      },
      priorSuspensions: [{ payload: { days: 20 } }],
    });
    const sr = await service.submit('t1', 'c1', 'pu1', {
      type: 'SUSPENSION',
      payload: { days: 15 },
    });
    expect(sr.status).toBe('UNDER_REVIEW'); // 20 + 15 > 30
  });
});

describe('ServiceRequestsService — validation & isolation', () => {
  it('rejects a connection that is not on the account', async () => {
    const { service } = makeService({ connection: null });
    await expect(
      service.submit('t1', 'c1', 'pu1', {
        type: 'ADDON_ADD',
        connectionId: 'someone-elses',
        payload: { addOnId: 'addon1' },
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects PLAN_CHANGE without a targetPlanId', async () => {
    const { service } = makeService({ policy: { mode: 'APPROVAL' } });
    await expect(
      service.submit('t1', 'c1', 'pu1', {
        type: 'PLAN_CHANGE',
        connectionId: 'conn1',
        payload: {},
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when the open-request cap is hit', async () => {
    const { service } = makeService({ openCount: 10 });
    await expect(
      service.submit('t1', 'c1', 'pu1', {
        type: 'OTHER',
        payload: {},
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('ServiceRequestsService — staff transitions', () => {
  it('rejects an illegal transition', async () => {
    const { service } = makeService({
      existingSr: { id: 'sr1', status: 'SUBMITTED' },
    });
    await expect(
      service.transition('t1', { userId: 'u1' } as never, 'sr1', {
        toStatus: 'COMPLETED',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows SUBMITTED → APPROVED and stamps resolvedAt only on terminal states', async () => {
    const { service, prisma } = makeService({
      existingSr: { id: 'sr1', status: 'SUBMITTED' },
    });
    await service.transition('t1', { userId: 'u1' } as never, 'sr1', {
      toStatus: 'APPROVED',
    });
    const updateArg = prisma.serviceRequest.update.mock.calls[0][0];
    expect(updateArg.data.status).toBe('APPROVED');
    expect(updateArg.data.resolvedAt).toBeUndefined();
  });

  it('stamps resolvedAt on COMPLETED', async () => {
    const { service, prisma } = makeService({
      existingSr: { id: 'sr1', status: 'IN_PROGRESS' },
    });
    await service.transition('t1', { userId: 'u1' } as never, 'sr1', {
      toStatus: 'COMPLETED',
    });
    const updateArg = prisma.serviceRequest.update.mock.calls[0][0];
    expect(updateArg.data.resolvedAt).toBeInstanceOf(Date);
  });
});
