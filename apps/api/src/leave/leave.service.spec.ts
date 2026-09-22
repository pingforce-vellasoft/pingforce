import { LeaveService } from './leave.service';
import { LeaveRepository } from './leave.repository';
import { RbacService } from '../rbac/rbac.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InAppNotificationService } from '../notifications/in-app-notification.service';
import { LeaveRequest } from '@prisma/client';
import { WorkflowEngineService } from '../approvals/workflow-engine.service';

function setup() {
  let leave = {
    id: 'r1',
    tenantId: 't1',
    employeeId: 'e1',
    leaveTypeId: 'lt1',
    startDate: new Date('2026-09-21'),
    endDate: new Date('2026-09-21'),
    duration: 'FULL_DAY',
    requestedDays: 1,
    status: 'PENDING',
  } as LeaveRequest;
  const repo = {
    client: {},
    employee: jest.fn().mockResolvedValue({ id: 'e1' }),
    owner: jest
      .fn()
      .mockResolvedValue({ user: { id: 'u1', email: 'user@example.test' } }),
    type: jest.fn().mockResolvedValue({ id: 'lt1' }),
    types: jest.fn().mockResolvedValue([]),
    settings: jest.fn().mockResolvedValue(null),
    balances: jest.fn().mockResolvedValue([]),
    balance: jest.fn().mockResolvedValue({
      id: 'b1',
      availableDays: 10,
      reservedDays: 1,
      usedDays: 1,
    }),
    overlapping: jest.fn().mockResolvedValue([]),
    changeBalance: jest.fn().mockResolvedValue({ count: 1 }),
    create: jest
      .fn()
      .mockImplementation(async (data) => ({ ...leave, ...data })),
    request: jest.fn().mockImplementation(async () => leave),
    update: jest.fn().mockImplementation(async (_t, _id, _status, data) => {
      leave = { ...leave, ...data };
      return { count: 1 };
    }),
    list: jest.fn().mockResolvedValue([]),
    ledger: jest.fn().mockResolvedValue({}),
    audit: jest.fn().mockResolvedValue({}),
    cancelWorkflow: jest.fn().mockResolvedValue(undefined),
    notificationTemplates: jest.fn().mockResolvedValue(undefined),
    reportingManager: jest.fn().mockResolvedValue(null),
    assignedApprover: jest.fn().mockResolvedValue(null),
  };
  const repository = {
    read: () => repo,
    transaction: jest.fn().mockImplementation(async (work) => work(repo)),
  };
  const rbac = {
    hasPermission: jest.fn().mockResolvedValue(true),
    getDataScope: jest.fn().mockResolvedValue('TEAM'),
    buildEmployeeScopeFilter: jest
      .fn()
      .mockResolvedValue({ employeeId: { in: ['e1'] } }),
  };
  const approvals = {
    authorizeDecision: jest.fn().mockResolvedValue(undefined),
    process: jest.fn().mockImplementation(async (_request, apply) => ({
      finalized: true,
      result: await apply(),
    })),
  };
  const notifications = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendPush: jest.fn().mockResolvedValue(undefined),
  };
  const workflow = {
    findActiveWorkflow: jest.fn().mockResolvedValue(null),
    getOrCreateInstance: jest.fn(),
  };
  const inApp = { create: jest.fn().mockResolvedValue({}) };
  const service = new LeaveService(
    repository as unknown as LeaveRepository,
    rbac as unknown as RbacService,
    approvals as unknown as ApprovalsService,
    notifications as unknown as NotificationsService,
    inApp as unknown as InAppNotificationService,
    workflow as unknown as WorkflowEngineService,
  );
  return {
    service,
    repo,
    rbac,
    approvals,
    notifications,
    inApp,
    workflow,
    setLeave: (value: Partial<LeaveRequest>) => {
      leave = { ...leave, ...value };
    },
  };
}
const request = {
  leaveTypeId: 'lt1',
  startDate: '2026-09-21',
  endDate: '2026-09-21',
  duration: 'FULL_DAY' as const,
};

describe('Leave lifecycle', () => {
  it('previews chargeable days without reserving a balance', async () => {
    const { service, repo } = setup();
    expect(await service.preview('t1', request)).toEqual({ requestedDays: 1 });
    expect(repo.changeBalance).not.toHaveBeenCalled();
    repo.type.mockResolvedValue(null);
    await expect(service.preview('t1', request)).rejects.toThrow('Leave type');
  });
  it('uses tenant-scoped types and approval capability', async () => {
    const { service, repo, rbac } = setup();
    await service.getLeaveTypes('t1');
    expect(repo.types).toHaveBeenCalledWith('t1');
    expect(await service.access('u1')).toEqual({ canApprove: true });
    expect(rbac.hasPermission).toHaveBeenCalledWith('u1', 'LEAVES', 'APPROVE');
  });
  it('supports the own legacy balance route and paginates filtered history', async () => {
    const { service, repo } = setup();
    await service.getLeaveBalances('t1', 'u1', 'e1', 2026);
    expect(repo.balances).toHaveBeenCalledWith('t1', 'e1', 2026);
    await service.getMyRequests('t1', 'u1', 'APPROVED', 25, 500);
    expect(repo.list).toHaveBeenCalledWith(
      't1',
      { employeeId: 'e1', status: 'APPROVED' },
      25,
      100,
    );
  });
  it('initializes the configured workflow and notifies its named approver', async () => {
    const { service, repo, workflow, notifications } = setup();
    workflow.findActiveWorkflow.mockResolvedValue({ id: 'wf1' });
    workflow.getOrCreateInstance.mockResolvedValue({
      id: 'wi1',
      currentStage: 1,
    });
    repo.assignedApprover.mockResolvedValue('manager-user');
    await service.requestLeave('t1', 'u1', request, 'trace');
    expect(workflow.getOrCreateInstance).toHaveBeenCalledWith(
      { id: 'wf1' },
      'r1',
      'e1',
      { leaveTypeId: 'lt1', days: 1 },
      repo.client,
    );
    expect(notifications.sendPush).toHaveBeenCalledWith(
      't1',
      'manager-user',
      'LEAVE_REVIEW_PUSH',
      {},
    );
  });
  it('does not notify an unauthorized reporting manager', async () => {
    const { service, repo, approvals, notifications } = setup();
    repo.reportingManager.mockResolvedValue('manager-user');
    approvals.authorizeDecision.mockRejectedValue(
      new Error('Outside data scope'),
    );
    await service.requestLeave('t1', 'u1', request);
    expect(notifications.sendEmail).not.toHaveBeenCalled();
  });
  it('notifies an authorized reporting manager when there is no workflow', async () => {
    const { service, repo, notifications } = setup();
    repo.reportingManager.mockResolvedValue('manager-user');
    await service.requestLeave('t1', 'u1', request);
    expect(notifications.sendEmail).toHaveBeenCalledWith(
      't1',
      'manager-user',
      'LEAVE_REVIEW_EMAIL',
      {},
    );
  });
  it('does not send status messages when the employee no longer has an account', async () => {
    const { service, repo, notifications } = setup();
    repo.owner.mockResolvedValue(null);
    await service.updateLeaveStatus('t1', 'r1', 'APPROVED', 'manager');
    expect(notifications.sendEmail).not.toHaveBeenCalled();
  });
  it('rejects lost state-transition races before changing balances', async () => {
    const { service, repo } = setup();
    repo.update.mockResolvedValue({ count: 0 });
    await expect(
      service.updateLeaveStatus('t1', 'r1', 'APPROVED', 'manager'),
    ).rejects.toThrow('already changed');
    await expect(service.withdraw('t1', 'u1', 'r1')).rejects.toThrow(
      'already changed',
    );
    expect(repo.changeBalance).not.toHaveBeenCalled();
  });
  it('rejects missing requests without revealing another tenant', async () => {
    const { service, repo } = setup();
    repo.request.mockResolvedValue(null);
    await expect(
      service.updateLeaveStatus('t1', 'missing', 'APPROVED', 'manager'),
    ).rejects.toThrow('not found');
    await expect(service.withdraw('t1', 'u1', 'missing')).rejects.toThrow(
      'not found',
    );
  });
  it('does not allow employees to withdraw approved leave', async () => {
    const { service, setLeave, repo } = setup();
    setLeave({ status: 'APPROVED' });
    await expect(service.withdraw('t1', 'u1', 'r1')).rejects.toThrow(
      'Only pending',
    );
    expect(repo.changeBalance).not.toHaveBeenCalled();
  });
  it('requires a valid balance before cancellation or approval', async () => {
    const { service, repo } = setup();
    repo.balance.mockResolvedValue(null);
    await expect(service.withdraw('t1', 'u1', 'r1')).rejects.toThrow(
      'reconciliation',
    );
    await expect(
      service.updateLeaveStatus('t1', 'r1', 'APPROVED', 'manager'),
    ).rejects.toThrow('reconciliation');
  });
  it('reserves on submission without charging used days', async () => {
    const { service, repo } = setup();
    await service.requestLeave('t1', 'u1', request, 'request-1');
    expect(repo.changeBalance).toHaveBeenCalledWith('t1', 'b1', {
      reservedDays: { increment: 1 },
      availableDays: { decrement: 1 },
      updatedBy: 'u1',
    });
    expect(repo.ledger).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', action: 'RESERVED', days: 1 }),
    );
    expect(repo.audit).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'request-1' }),
    );
  });
  it('rejects a missing or foreign-tenant leave type before mutation', async () => {
    const { service, repo } = setup();
    repo.type.mockResolvedValue(null);
    await expect(service.requestLeave('t1', 'u1', request)).rejects.toThrow(
      'Leave type',
    );
    expect(repo.changeBalance).not.toHaveBeenCalled();
  });
  it('rejects insufficient balance', async () => {
    const { service, repo } = setup();
    repo.balance.mockResolvedValue({ id: 'b1', availableDays: 0 });
    await expect(service.requestLeave('t1', 'u1', request)).rejects.toThrow(
      'Insufficient',
    );
  });
  it('rejects overlap but allows complementary half days', async () => {
    const { service, repo } = setup();
    repo.overlapping.mockResolvedValue([{ duration: 'FIRST_HALF' }]);
    await expect(service.requestLeave('t1', 'u1', request)).rejects.toThrow(
      'overlaps',
    );
    await expect(
      service.requestLeave('t1', 'u1', { ...request, duration: 'SECOND_HALF' }),
    ).resolves.toMatchObject({ requestedDays: 0.5 });
  });
  it('derives self-service employee from authenticated user', async () => {
    const { service, repo } = setup();
    await service.getMyBalances('t1', 'u1', 2026);
    expect(repo.employee).toHaveBeenCalledWith('t1', 'u1');
    expect(repo.balances).toHaveBeenCalledWith('t1', 'e1', 2026);
    await expect(
      service.getLeaveBalances('t1', 'u1', 'e2', 2026),
    ).rejects.toThrow('own leave balance');
  });
  it('fails when no employee is linked', async () => {
    const { service, repo } = setup();
    repo.employee.mockResolvedValue(null);
    await expect(service.getMyRequests('t1', 'u1')).rejects.toThrow(
      'No employee',
    );
  });
  it('scopes and paginates manager queues', async () => {
    const { service, repo } = setup();
    await service.getPendingLeaves('t1', 'u1');
    expect(repo.list).toHaveBeenCalledWith(
      't1',
      { employeeId: { in: ['e1'] }, status: 'PENDING' },
      0,
      25,
    );
  });
  it('returns no manager rows for denied scope', async () => {
    const { service, repo, rbac } = setup();
    rbac.buildEmployeeScopeFilter.mockResolvedValue(null);
    expect(await service.getPendingLeaves('t1', 'u1')).toEqual([]);
    expect(repo.list).not.toHaveBeenCalled();
  });
  it('approves using employee ID and converts reserved to used', async () => {
    const { service, repo } = setup();
    repo.employee.mockResolvedValue({ id: 'manager-employee' });
    await service.updateLeaveStatus('t1', 'r1', 'APPROVED', 'manager-user');
    expect(repo.update).toHaveBeenCalledWith(
      't1',
      'r1',
      'PENDING',
      expect.objectContaining({
        approvedBy: 'manager-employee',
        approvedAt: expect.any(Date),
      }),
    );
    expect(repo.changeBalance).toHaveBeenCalledWith(
      't1',
      'b1',
      expect.objectContaining({
        reservedDays: { decrement: 1 },
        usedDays: { increment: 1 },
      }),
    );
  });
  it('passes the same transaction to workflow processing', async () => {
    const { service, repo, approvals } = setup();
    await service.updateLeaveStatus('t1', 'r1', 'REJECTED', 'manager-user');
    expect(approvals.process).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Function),
      repo.client,
    );
    expect(repo.changeBalance).toHaveBeenCalledWith(
      't1',
      'b1',
      expect.objectContaining({
        availableDays: { increment: 1 },
        reservedDays: { decrement: 1 },
      }),
    );
  });
  it('does not change balances on an intermediate approval', async () => {
    const { service, repo, approvals, inApp } = setup();
    approvals.process.mockResolvedValue({
      finalized: false,
      nextStageNumber: 2,
    });
    expect(
      await service.updateLeaveStatus('t1', 'r1', 'APPROVED', 'manager'),
    ).toMatchObject({ status: 'PENDING' });
    expect(repo.changeBalance).not.toHaveBeenCalled();
    expect(inApp.create).not.toHaveBeenCalled();
  });
  it('does not process decisions on a cancelled request', async () => {
    const { service, approvals, setLeave } = setup();
    setLeave({ status: 'CANCELLED' });
    await expect(
      service.updateLeaveStatus('t1', 'r1', 'APPROVED', 'manager'),
    ).rejects.toThrow('pending');
    expect(approvals.process).not.toHaveBeenCalled();
  });
  it('rolls back through a thrown conflict when the reservation is inconsistent', async () => {
    const { service, repo } = setup();
    repo.balance.mockResolvedValue({ id: 'b1', reservedDays: 0 });
    await expect(
      service.updateLeaveStatus('t1', 'r1', 'APPROVED', 'manager'),
    ).rejects.toThrow('reconciliation');
    expect(repo.update).not.toHaveBeenCalled();
  });
  it('withdraws only own pending request and refunds once', async () => {
    const { service, repo } = setup();
    await service.withdraw('t1', 'u1', 'r1');
    await service.withdraw('t1', 'u1', 'r1');
    expect(repo.changeBalance).toHaveBeenCalledTimes(1);
    expect(repo.cancelWorkflow).toHaveBeenCalledWith('t1', 'r1');
  });
  it('does not reveal another employee request when withdrawing', async () => {
    const { service, repo } = setup();
    repo.employee.mockResolvedValue({ id: 'other' });
    await expect(service.withdraw('t1', 'u1', 'r1')).rejects.toThrow(
      'not found',
    );
  });
  it('requires scoped approval authority for approved cancellation', async () => {
    const { service, approvals, setLeave, repo } = setup();
    setLeave({ status: 'APPROVED' });
    approvals.authorizeDecision.mockRejectedValue(new Error('Out of scope'));
    await expect(
      service.cancelApproved('t1', 'manager', 'r1', 'Wrong dates'),
    ).rejects.toThrow('Out of scope');
    expect(repo.changeBalance).not.toHaveBeenCalled();
  });
  it('refunds stored days after approved cancellation', async () => {
    const { service, repo, setLeave } = setup();
    setLeave({ status: 'APPROVED', requestedDays: 0.5 });
    await service.cancelApproved('t1', 'manager', 'r1', 'Wrong dates');
    expect(repo.changeBalance).toHaveBeenCalledWith(
      't1',
      'b1',
      expect.objectContaining({
        availableDays: { increment: 0.5 },
        usedDays: { decrement: 0.5 },
      }),
    );
  });
  it('returns a committed result despite notification failure', async () => {
    const { service, notifications, inApp } = setup();
    notifications.sendEmail.mockRejectedValue(new Error('Offline'));
    inApp.create.mockRejectedValue(new Error('Offline'));
    await expect(
      service.updateLeaveStatus('t1', 'r1', 'APPROVED', 'manager'),
    ).resolves.toMatchObject({ status: 'APPROVED' });
  });
});
