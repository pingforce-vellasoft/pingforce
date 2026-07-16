import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApprovalsService, ApprovalRequest } from './approvals.service';

/**
 * Shared approval engine guarantees (ApprovalWorkflow.md): RBAC check,
 * TEAM-scope approver resolution, and the conflict-of-interest block
 * (nobody approves their own record).
 */

interface Mocks {
  hasPermission?: boolean;
  dataScope?: 'OWN' | 'TEAM' | 'BRANCH' | 'ALL' | null;
  actorEmployee?: { id: string } | null;
  ownerEmployee?: { reportingManagerId: string | null } | null;
}

function makeService(mocks: Mocks) {
  const prisma = {
    employee: {
      // First call resolves the actor, second (TEAM only) the owner
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(mocks.actorEmployee ?? null)
        .mockResolvedValueOnce(mocks.ownerEmployee ?? null),
    },
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  const rbacService = {
    hasPermission: jest.fn().mockResolvedValue(mocks.hasPermission ?? true),
    getDataScope: jest.fn().mockResolvedValue(mocks.dataScope ?? 'ALL'),
  };
  const service = new ApprovalsService(
    prisma as unknown as ConstructorParameters<typeof ApprovalsService>[0],
    auditService as unknown as ConstructorParameters<
      typeof ApprovalsService
    >[1],
    rbacService as unknown as ConstructorParameters<typeof ApprovalsService>[2],
  );
  return { service, auditService };
}

const baseRequest: ApprovalRequest = {
  tenantId: 't1',
  module: 'LEAVES',
  entityName: 'leave_request',
  entityId: 'lr1',
  ownerEmployeeId: 'e-owner',
  actorUserId: 'u-actor',
  decision: 'APPROVED',
};

describe('ApprovalsService.authorizeDecision', () => {
  it('rejects actors without the APPROVE permission', async () => {
    const { service } = makeService({ hasPermission: false });
    await expect(service.authorizeDecision(baseRequest)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('blocks self-approval (conflict of interest)', async () => {
    const { service } = makeService({
      dataScope: 'ALL',
      actorEmployee: { id: 'e-owner' },
    });
    await expect(service.authorizeDecision(baseRequest)).rejects.toThrow(
      'You cannot approve your own request',
    );
  });

  it('allows ALL-scoped approvers for records they do not own', async () => {
    const { service } = makeService({
      dataScope: 'ALL',
      actorEmployee: { id: 'e-hr' },
    });
    await expect(
      service.authorizeDecision(baseRequest),
    ).resolves.toBeUndefined();
  });

  it('TEAM scope: allows only direct reports', async () => {
    const { service } = makeService({
      dataScope: 'TEAM',
      actorEmployee: { id: 'e-mgr' },
      ownerEmployee: { reportingManagerId: 'e-mgr' },
    });
    await expect(
      service.authorizeDecision(baseRequest),
    ).resolves.toBeUndefined();
  });

  it('TEAM scope: rejects records outside the manager team', async () => {
    const { service } = makeService({
      dataScope: 'TEAM',
      actorEmployee: { id: 'e-mgr' },
      ownerEmployee: { reportingManagerId: 'e-other-mgr' },
    });
    await expect(service.authorizeDecision(baseRequest)).rejects.toThrow(
      'You may only approve requests from your direct reports',
    );
  });

  it('TEAM scope: 404 when the record owner does not exist', async () => {
    const { service } = makeService({
      dataScope: 'TEAM',
      actorEmployee: { id: 'e-mgr' },
      ownerEmployee: null,
    });
    await expect(service.authorizeDecision(baseRequest)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('ApprovalsService.process', () => {
  it('authorizes, applies, then audits the decision', async () => {
    const { service, auditService } = makeService({
      dataScope: 'ALL',
      actorEmployee: { id: 'e-hr' },
    });
    const apply = jest.fn().mockResolvedValue('done');
    await expect(service.process(baseRequest, apply)).resolves.toBe('done');
    expect(apply).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'WORKFLOW_APPROVED' }),
    );
  });

  it('never applies the change when authorization fails', async () => {
    const { service } = makeService({ hasPermission: false });
    const apply = jest.fn();
    await expect(service.process(baseRequest, apply)).rejects.toThrow(
      ForbiddenException,
    );
    expect(apply).not.toHaveBeenCalled();
  });
});
