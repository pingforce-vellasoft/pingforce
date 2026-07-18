import { NotFoundException } from '@nestjs/common';
import { LeaveService } from './leave.service';

/**
 * Self-service leave endpoints (mobile Leave screen): types, own balance and
 * own history must always derive the employee from the JWT — never trust a
 * client-supplied id.
 */

function makeService(opts: { employee?: { id: string } | null } = {}) {
  const prisma = {
    leaveType: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'lt1', name: 'Annual', code: 'ANNUAL', isPaid: true },
      ]),
    },
    employee: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          opts.employee === undefined ? { id: 'e1' } : opts.employee,
        ),
    },
    leaveBalance: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'b1', availableDays: 13, leaveType: { name: 'Annual' } },
      ]),
    },
    leaveRequest: {
      findMany: jest.fn().mockResolvedValue([{ id: 'r1', status: 'PENDING' }]),
    },
  };
  const rbac = {} as never;
  const approvals = {} as never;
  const notifications = {} as never;
  const inApp = {} as never;
  const service = new LeaveService(
    prisma as never,
    rbac,
    approvals,
    notifications,
    inApp,
  );
  return { service, prisma };
}

const TENANT = 't1';
const USER = 'u1';

describe('LeaveService self-service', () => {
  it('lists active leave types for the tenant', async () => {
    const { service, prisma } = makeService();
    const types = await service.getLeaveTypes(TENANT);
    expect(types).toHaveLength(1);
    expect(prisma.leaveType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, deletedAt: null },
      }),
    );
  });

  it('scopes my-balance to the resolved employee, not a client id', async () => {
    const { service, prisma } = makeService();
    await service.getMyBalances(TENANT, USER, 2026);
    expect(prisma.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, userId: USER, deletedAt: null },
      }),
    );
    expect(prisma.leaveBalance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          employeeId: 'e1',
          year: 2026,
        }),
      }),
    );
  });

  it('filters my history by status when provided', async () => {
    const { service, prisma } = makeService();
    await service.getMyRequests(TENANT, USER, 'APPROVED');
    expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          employeeId: 'e1',
          status: 'APPROVED',
        }),
      }),
    );
  });

  it('omits the status filter when none is given', async () => {
    const { service, prisma } = makeService();
    await service.getMyRequests(TENANT, USER);
    const arg = prisma.leaveRequest.findMany.mock.calls[0][0];
    expect(arg.where).not.toHaveProperty('status');
  });

  it('caps the page size at 100', async () => {
    const { service, prisma } = makeService();
    await service.getMyRequests(TENANT, USER, undefined, 0, 500);
    const arg = prisma.leaveRequest.findMany.mock.calls[0][0];
    expect(arg.take).toBe(100);
  });

  it('throws when the user has no employee record', async () => {
    const { service } = makeService({ employee: null });
    await expect(service.getMyBalances(TENANT, USER, 2026)).rejects.toThrow(
      NotFoundException,
    );
  });
});
