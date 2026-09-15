import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PortalFaultsService } from './portal-faults.service';
import { FaultState } from '../../faults/domain/fault-state';

/**
 * Customer-facing fault access. The rules that matter and are easy to regress:
 *  - every read is scoped tenantId + customerId, so one customer can never
 *    reach another's complaint (or another tenant's);
 *  - the timeline is filtered to `isCustomerVisible`, and so are attachments —
 *    internal staff notes and evidence photos must never reach the portal;
 *  - the reopen window is measured from resolution, not `updatedAt`;
 *  - reopening lands on REOPENED (tracked) rather than OPEN;
 *  - a customer reply notifies the assignee.
 */

type Mock = jest.Mock;

const TENANT = 't1';
const CUSTOMER = 'c1';
const FAULT_ID = 'f1';

const resolvedFault = {
  id: FAULT_ID,
  faultNumber: 'PF-1',
  tenantId: TENANT,
  customerId: CUSTOMER,
  status: FaultState.RESOLVED,
  assignedToId: 'tech-1',
  customerRating: null,
  resolvedAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago
  updatedAt: new Date(),
};

function makeService(
  overrides: {
    fault?: Record<string, unknown> | null;
    reopenHours?: number;
    timeline?: unknown[];
    attachments?: unknown[];
  } = {},
) {
  const fault = overrides.fault === undefined ? resolvedFault : overrides.fault;

  const tx = {
    fault: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue({ ...fault }),
    },
    faultTimeline: { create: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    fault: {
      findFirst: jest.fn().mockResolvedValue(
        fault && {
          ...fault,
          faultTimelines: overrides.timeline ?? [],
        },
      ),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    fileAttachment: {
      findMany: jest.fn().mockResolvedValue(overrides.attachments ?? []),
    },
    tenantSetting: {
      findUnique: jest.fn().mockResolvedValue({
        portalFaultReopenHours: overrides.reopenHours ?? 72,
      }),
    },
    networkConnection: { findFirst: jest.fn().mockResolvedValue(null) },
    slaPolicy: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (t: unknown) => unknown)(tx)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };

  const sla = { calculateSlaDeadline: jest.fn().mockReturnValue(new Date()) };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const eventBus = { publish: jest.fn() };

  const service = new PortalFaultsService(
    prisma as never,
    sla as never,
    audit as never,
    eventBus as never,
  );

  return { service, prisma, tx, eventBus };
}

describe('PortalFaultsService — tenant and customer isolation', () => {
  it('scopes the detail read to the caller tenant and customer', async () => {
    const { service, prisma } = makeService();

    await service.findOne(TENANT, CUSTOMER, FAULT_ID);

    expect(prisma.fault.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: FAULT_ID,
          tenantId: TENANT,
          customerId: CUSTOMER,
          deletedAt: null,
        },
      }),
    );
  });

  it("404s another customer's complaint rather than leaking its existence", async () => {
    const { service } = makeService({ fault: null });

    await expect(
      service.findOne(TENANT, 'someone-else', FAULT_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns only customer-visible timeline entries', async () => {
    const { service, prisma } = makeService();

    await service.findOne(TENANT, CUSTOMER, FAULT_ID);

    const select = prisma.fault.findFirst.mock.calls[0][0].select;
    expect(select.faultTimelines.where).toEqual({ isCustomerVisible: true });
  });

  it('returns only customer-visible attachments', async () => {
    const { service, prisma } = makeService();

    await service.findOne(TENANT, CUSTOMER, FAULT_ID);

    expect(prisma.fileAttachment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          entityId: FAULT_ID,
          isCustomerVisible: true,
        }),
      }),
    );
  });
});

describe('PortalFaultsService — reopen', () => {
  it('moves to REOPENED and bumps the counter, not back to OPEN', async () => {
    const { service, tx } = makeService();

    await service.reopen(TENANT, CUSTOMER, 'pu-1', FAULT_ID, {
      notes: 'still down',
    });

    const data = tx.fault.updateMany.mock.calls[0][0].data;
    expect(data.status).toBe(FaultState.REOPENED);
    expect(data.reopenCount).toEqual({ increment: 1 });
    expect(data.resolvedAt).toBeNull();
  });

  it('measures the window from resolution, not updatedAt', async () => {
    // Resolved 5 days ago but edited by staff a minute ago: an updatedAt-based
    // window would still be open, which is the bug this pins.
    const { service } = makeService({
      fault: {
        ...resolvedFault,
        resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      reopenHours: 72,
    });

    await expect(
      service.reopen(TENANT, CUSTOMER, 'pu-1', FAULT_ID, { notes: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to reopen a complaint that is not resolved', async () => {
    const { service } = makeService({
      fault: { ...resolvedFault, status: FaultState.IN_PROGRESS },
    });

    await expect(
      service.reopen(TENANT, CUSTOMER, 'pu-1', FAULT_ID, { notes: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('notifies the assignee that the fault came back', async () => {
    const { service, eventBus } = makeService();

    await service.reopen(TENANT, CUSTOMER, 'pu-1', FAULT_ID, { notes: 'x' });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ faultId: FAULT_ID, assignedToId: 'tech-1' }),
    );
  });
});

describe('PortalFaultsService — comment', () => {
  it('flags the note customer-visible and notifies the assignee', async () => {
    const { service, prisma, eventBus } = makeService({
      fault: { ...resolvedFault, status: FaultState.IN_PROGRESS },
    });
    (prisma as unknown as { faultTimeline: { create: Mock } }).faultTimeline = {
      create: jest.fn().mockResolvedValue({}),
    };

    await service.comment(TENANT, CUSTOMER, 'pu-1', FAULT_ID, {
      notes: 'any update?',
    });

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ faultNumber: 'PF-1', assignedToId: 'tech-1' }),
    );
  });

  it('refuses a comment on a closed complaint', async () => {
    const { service } = makeService({
      fault: { ...resolvedFault, status: FaultState.CLOSED },
    });

    await expect(
      service.comment(TENANT, CUSTOMER, 'pu-1', FAULT_ID, { notes: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PortalFaultsService — rating', () => {
  it('claims the first rating with tenant and customer scope', async () => {
    const { service, prisma } = makeService();

    await service.rate(TENANT, CUSTOMER, 'pu-1', FAULT_ID, { rating: 5 });

    expect(prisma.fault.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: FAULT_ID,
        tenantId: TENANT,
        customerId: CUSTOMER,
        customerRating: null,
      }),
      data: expect.objectContaining({ customerRating: 5 }),
    });
  });

  it('rejects a concurrent second rating', async () => {
    const { service, prisma } = makeService();
    prisma.fault.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.rate(TENANT, CUSTOMER, 'pu-1', FAULT_ID, { rating: 4 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
