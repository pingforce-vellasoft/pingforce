import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApprovalsService, ApprovalRequest } from './approvals.service';

/**
 * Shared approval engine guarantees (ApprovalWorkflow.md): RBAC check,
 * data-scope approver resolution (owner must be inside the actor's resolved
 * scope — DataScope.md §4), and the conflict-of-interest block (nobody
 * approves their own record).
 */

type ResolvedScope =
  | { kind: 'ALL' }
  | { kind: 'NONE' }
  | { kind: 'IDS'; employeeIds: string[]; userIds: string[] };

interface Mocks {
  hasPermission?: boolean;
  resolvedScope?: ResolvedScope;
  actorEmployee?: { id: string } | null;
  ownerEmployee?: { id: string } | null;
}

function makeService(mocks: Mocks) {
  const prisma = {
    employee: {
      // First call resolves the actor, second (non-ALL scopes) the owner
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(mocks.actorEmployee ?? null)
        .mockResolvedValueOnce(mocks.ownerEmployee ?? null),
    },
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };
  const rbacService = {
    hasPermission: jest.fn().mockResolvedValue(mocks.hasPermission ?? true),
    resolveScopeIds: jest
      .fn()
      .mockResolvedValue(mocks.resolvedScope ?? { kind: 'ALL' }),
  };
  // No active WorkflowDefinition — exercises the single-stage fallback path
  const workflowEngine = {
    findActiveWorkflow: jest.fn().mockResolvedValue(null),
    findDelegationFor: jest.fn().mockResolvedValue(null),
  };
  const service = new ApprovalsService(
    prisma as unknown as ConstructorParameters<typeof ApprovalsService>[0],
    auditService as unknown as ConstructorParameters<
      typeof ApprovalsService
    >[1],
    rbacService as unknown as ConstructorParameters<typeof ApprovalsService>[2],
    workflowEngine as unknown as ConstructorParameters<
      typeof ApprovalsService
    >[3],
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
      resolvedScope: { kind: 'ALL' },
      actorEmployee: { id: 'e-owner' },
    });
    await expect(service.authorizeDecision(baseRequest)).rejects.toThrow(
      'You cannot approve your own request',
    );
  });

  it('allows ALL-scoped approvers for records they do not own', async () => {
    const { service } = makeService({
      resolvedScope: { kind: 'ALL' },
      actorEmployee: { id: 'e-hr' },
    });
    await expect(
      service.authorizeDecision(baseRequest),
    ).resolves.toBeUndefined();
  });

  it('scoped approvers: allows owners inside the resolved scope (incl. indirect reports)', async () => {
    const { service } = makeService({
      resolvedScope: {
        kind: 'IDS',
        // e-owner is an indirect report reached via the hierarchy walk
        employeeIds: ['e-mgr', 'e-direct', 'e-owner'],
        userIds: ['u-actor'],
      },
      actorEmployee: { id: 'e-mgr' },
      ownerEmployee: { id: 'e-owner' },
    });
    await expect(
      service.authorizeDecision(baseRequest),
    ).resolves.toBeUndefined();
  });

  it('scoped approvers: rejects owners outside the resolved scope', async () => {
    const { service } = makeService({
      resolvedScope: {
        kind: 'IDS',
        employeeIds: ['e-mgr', 'e-someone-else'],
        userIds: ['u-actor'],
      },
      actorEmployee: { id: 'e-mgr' },
      ownerEmployee: { id: 'e-owner' },
    });
    await expect(service.authorizeDecision(baseRequest)).rejects.toThrow(
      'You may only approve requests within your data scope',
    );
  });

  it('NONE scope: rejects even existing owners (deny by default)', async () => {
    const { service } = makeService({
      resolvedScope: { kind: 'NONE' },
      actorEmployee: { id: 'e-mgr' },
      ownerEmployee: { id: 'e-owner' },
    });
    await expect(service.authorizeDecision(baseRequest)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('404 when the record owner does not exist', async () => {
    const { service } = makeService({
      resolvedScope: { kind: 'IDS', employeeIds: ['e-mgr'], userIds: [] },
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
      resolvedScope: { kind: 'ALL' },
      actorEmployee: { id: 'e-hr' },
    });
    const apply = jest.fn().mockResolvedValue('done');
    const outcome = await service.process(baseRequest, apply);
    expect(outcome.finalized).toBe(true);
    expect(outcome.result).toBe('done');
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

describe('ApprovalsService.process — multi-stage routing (ApprovalWorkflow.md §8)', () => {
  const stage = (n: number) => ({
    id: `s${n}`,
    stageNumber: n,
    stageName: `Stage ${n}`,
    approvalMode: 'SEQUENTIAL',
    minimumApprovals: 1,
    requiredAction: 'APPROVE',
    approverRoleId: null,
    approverUserId: null,
    slaHours: null,
  });
  const workflow = {
    id: 'wf1',
    tenantId: 't1',
    code: 'TWO_STAGE',
    module: 'LEAVES',
    entityName: 'leave_request',
    stages: [stage(1), stage(2)],
  };

  function makeStagedService(engineOutcome: Record<string, unknown>) {
    const prisma = {
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e-mgr' }),
      },
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const rbacService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      resolveScopeIds: jest.fn().mockResolvedValue({ kind: 'ALL' }),
    };
    const workflowEngine = {
      findActiveWorkflow: jest.fn().mockResolvedValue(workflow),
      findDelegationFor: jest.fn().mockResolvedValue(null),
      getOrCreateInstance: jest
        .fn()
        .mockResolvedValue({ id: 'i1', currentStage: 1 }),
      applyAction: jest.fn().mockResolvedValue(engineOutcome),
    };
    const service = new ApprovalsService(
      prisma as unknown as ConstructorParameters<typeof ApprovalsService>[0],
      auditService as unknown as ConstructorParameters<
        typeof ApprovalsService
      >[1],
      rbacService as unknown as ConstructorParameters<
        typeof ApprovalsService
      >[2],
      workflowEngine as unknown as ConstructorParameters<
        typeof ApprovalsService
      >[3],
    );
    return { service, workflowEngine };
  }

  it('intermediate approval advances the stage without applying the change', async () => {
    const { service } = makeStagedService({
      instanceId: 'i1',
      finalized: false,
      status: 'IN_PROGRESS',
      stageNumber: 1,
      stageName: 'Stage 1',
      nextStageNumber: 2,
      nextStageName: 'Stage 2',
      totalStages: 2,
    });
    const apply = jest.fn();
    const outcome = await service.process(baseRequest, apply);
    expect(outcome.finalized).toBe(false);
    expect(outcome.nextStageNumber).toBe(2);
    expect(apply).not.toHaveBeenCalled();
  });

  it('final-stage approval applies the module state change', async () => {
    const { service } = makeStagedService({
      instanceId: 'i1',
      finalized: true,
      status: 'APPROVED',
      stageNumber: 1,
      stageName: 'Stage 1',
      totalStages: 2,
    });
    const apply = jest.fn().mockResolvedValue('applied');
    const outcome = await service.process(baseRequest, apply);
    expect(outcome.finalized).toBe(true);
    expect(outcome.result).toBe('applied');
    expect(apply).toHaveBeenCalled();
  });
});
