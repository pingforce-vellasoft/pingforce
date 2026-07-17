import { ConflictException } from '@nestjs/common';
import {
  WorkflowEngineService,
  ActiveWorkflow,
} from './workflow-engine.service';

/**
 * Multi-stage workflow engine (ApprovalWorkflow.md): conditional routing
 * (§11), sequential/parallel stage advancement (§8), terminal rejection,
 * one-vote-per-stage guard and SLA escalation sweep (§12).
 */

function makeStage(
  stageNumber: number,
  overrides: Partial<ActiveWorkflow['stages'][number]> = {},
) {
  return {
    id: `s${stageNumber}`,
    stageNumber,
    stageName: `Stage ${stageNumber}`,
    approvalMode: 'SEQUENTIAL',
    minimumApprovals: 1,
    requiredAction: 'APPROVE',
    approverRoleId: null,
    approverUserId: null,
    slaHours: null,
    ...overrides,
  };
}

const twoStageWorkflow: ActiveWorkflow = {
  id: 'wf1',
  tenantId: 't1',
  code: 'LEAVE_2_STAGE',
  module: 'LEAVES',
  entityName: 'leave_request',
  stages: [makeStage(1), makeStage(2)],
};

interface TxState {
  instance: {
    id: string;
    tenantId: string;
    status: string;
    currentStage: number;
  };
  priorActions: { actorUserId: string; decision: string }[];
}

function makeEngine(state: TxState) {
  const instanceUpdates: unknown[] = [];
  const createdActions: unknown[] = [];

  const tx = {
    workflowInstance: {
      findFirst: jest.fn().mockResolvedValue(state.instance),
      update: jest.fn().mockImplementation(({ data }) => {
        instanceUpdates.push(data);
        return Promise.resolve({ ...state.instance, ...data });
      }),
    },
    workflowAction: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const found = state.priorActions.find(
          (a) => a.actorUserId === where.actorUserId,
        );
        return Promise.resolve(found ?? null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        createdActions.push(data);
        state.priorActions.push(data as never);
        return Promise.resolve(data);
      }),
      count: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            state.priorActions.filter((a) => a.decision === 'APPROVED').length,
          ),
        ),
    },
  };

  const prisma = {
    $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    workflowDefinition: { findMany: jest.fn() },
    workflowInstance: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    workflowDelegation: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const auditService = { log: jest.fn().mockResolvedValue(undefined) };

  const engine = new WorkflowEngineService(
    prisma as unknown as ConstructorParameters<typeof WorkflowEngineService>[0],
    auditService as unknown as ConstructorParameters<
      typeof WorkflowEngineService
    >[1],
  );
  return { engine, prisma, auditService, instanceUpdates, createdActions };
}

describe('WorkflowEngineService.findActiveWorkflow (conditional routing §11)', () => {
  function makeRoutingEngine(definitions: unknown[]) {
    const prisma = {
      workflowDefinition: {
        findMany: jest.fn().mockResolvedValue(definitions),
      },
    };
    const auditService = { log: jest.fn() };
    return new WorkflowEngineService(prisma as never, auditService as never);
  }

  const stage = makeStage(1);

  it('conditional definitions win over unconditional fallbacks when they match', async () => {
    const engine = makeRoutingEngine([
      {
        id: 'fallback',
        tenantId: 't1',
        code: 'FB',
        module: 'CLAIMS',
        entityName: 'expense_claim',
        conditions: null,
        stages: [stage],
      },
      {
        id: 'high-value',
        tenantId: 't1',
        code: 'HV',
        module: 'CLAIMS',
        entityName: 'expense_claim',
        conditions: [{ field: 'amount', op: 'gte', value: 1000 }],
        stages: [stage],
      },
    ]);
    const matched = await engine.findActiveWorkflow(
      't1',
      'CLAIMS',
      'expense_claim',
      { amount: 5000 },
    );
    expect(matched?.id).toBe('high-value');
  });

  it('falls back to the unconditional definition when conditions do not match', async () => {
    const engine = makeRoutingEngine([
      {
        id: 'fallback',
        tenantId: 't1',
        code: 'FB',
        module: 'CLAIMS',
        entityName: 'expense_claim',
        conditions: null,
        stages: [stage],
      },
      {
        id: 'high-value',
        tenantId: 't1',
        code: 'HV',
        module: 'CLAIMS',
        entityName: 'expense_claim',
        conditions: [{ field: 'amount', op: 'gte', value: 1000 }],
        stages: [stage],
      },
    ]);
    const matched = await engine.findActiveWorkflow(
      't1',
      'CLAIMS',
      'expense_claim',
      { amount: 50 },
    );
    expect(matched?.id).toBe('fallback');
  });

  it('returns null when no definitions exist (single-stage fallback)', async () => {
    const engine = makeRoutingEngine([]);
    await expect(
      engine.findActiveWorkflow('t1', 'LEAVES', 'leave_request'),
    ).resolves.toBeNull();
  });

  it('malformed condition rules fail closed (definition skipped)', async () => {
    const engine = makeRoutingEngine([
      {
        id: 'bad',
        tenantId: 't1',
        code: 'BAD',
        module: 'CLAIMS',
        entityName: 'expense_claim',
        conditions: [{ op: 'gte', value: 1 }],
        stages: [stage],
      },
    ]);
    await expect(
      engine.findActiveWorkflow('t1', 'CLAIMS', 'expense_claim', { amount: 9 }),
    ).resolves.toBeNull();
  });
});

describe('WorkflowEngineService.applyAction (stage advancement §8)', () => {
  it('sequential approval advances to the next stage without finalizing', async () => {
    const { engine, instanceUpdates } = makeEngine({
      instance: {
        id: 'i1',
        tenantId: 't1',
        status: 'IN_PROGRESS',
        currentStage: 1,
      },
      priorActions: [],
    });
    const outcome = await engine.applyAction(twoStageWorkflow, 'i1', {
      tenantId: 't1',
      actorUserId: 'u-mgr',
      decision: 'APPROVED',
    });
    expect(outcome.finalized).toBe(false);
    expect(outcome.nextStageNumber).toBe(2);
    expect(instanceUpdates[0]).toMatchObject({ currentStage: 2 });
  });

  it('final-stage approval finalizes the instance as APPROVED', async () => {
    const { engine, instanceUpdates } = makeEngine({
      instance: {
        id: 'i1',
        tenantId: 't1',
        status: 'IN_PROGRESS',
        currentStage: 2,
      },
      priorActions: [],
    });
    const outcome = await engine.applyAction(twoStageWorkflow, 'i1', {
      tenantId: 't1',
      actorUserId: 'u-hr',
      decision: 'APPROVED',
    });
    expect(outcome.finalized).toBe(true);
    expect(outcome.status).toBe('APPROVED');
    expect(instanceUpdates[0]).toMatchObject({ status: 'APPROVED' });
  });

  it('rejection is terminal at any stage', async () => {
    const { engine, instanceUpdates } = makeEngine({
      instance: {
        id: 'i1',
        tenantId: 't1',
        status: 'IN_PROGRESS',
        currentStage: 1,
      },
      priorActions: [],
    });
    const outcome = await engine.applyAction(twoStageWorkflow, 'i1', {
      tenantId: 't1',
      actorUserId: 'u-mgr',
      decision: 'REJECTED',
    });
    expect(outcome.finalized).toBe(true);
    expect(outcome.status).toBe('REJECTED');
    expect(instanceUpdates[0]).toMatchObject({ status: 'REJECTED' });
  });

  it('parallel stage waits for the approval quorum', async () => {
    const parallel: ActiveWorkflow = {
      ...twoStageWorkflow,
      stages: [
        makeStage(1, { approvalMode: 'PARALLEL', minimumApprovals: 2 }),
        makeStage(2),
      ],
    };
    const { engine } = makeEngine({
      instance: {
        id: 'i1',
        tenantId: 't1',
        status: 'IN_PROGRESS',
        currentStage: 1,
      },
      priorActions: [],
    });
    const first = await engine.applyAction(parallel, 'i1', {
      tenantId: 't1',
      actorUserId: 'u-a',
      decision: 'APPROVED',
    });
    // Quorum of 2 not reached — stays on stage 1
    expect(first.finalized).toBe(false);
    expect(first.nextStageNumber).toBe(1);
  });

  it('parallel stage advances once the quorum is reached', async () => {
    const parallel: ActiveWorkflow = {
      ...twoStageWorkflow,
      stages: [
        makeStage(1, { approvalMode: 'PARALLEL', minimumApprovals: 2 }),
        makeStage(2),
      ],
    };
    const { engine } = makeEngine({
      instance: {
        id: 'i1',
        tenantId: 't1',
        status: 'IN_PROGRESS',
        currentStage: 1,
      },
      priorActions: [{ actorUserId: 'u-a', decision: 'APPROVED' }],
    });
    const second = await engine.applyAction(parallel, 'i1', {
      tenantId: 't1',
      actorUserId: 'u-b',
      decision: 'APPROVED',
    });
    expect(second.nextStageNumber).toBe(2);
  });

  it('blocks a second vote by the same approver on one stage', async () => {
    const { engine } = makeEngine({
      instance: {
        id: 'i1',
        tenantId: 't1',
        status: 'IN_PROGRESS',
        currentStage: 1,
      },
      priorActions: [{ actorUserId: 'u-a', decision: 'APPROVED' }],
    });
    await expect(
      engine.applyAction(twoStageWorkflow, 'i1', {
        tenantId: 't1',
        actorUserId: 'u-a',
        decision: 'APPROVED',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects actions on instances that are not in progress', async () => {
    const { engine } = makeEngine({
      instance: {
        id: 'i1',
        tenantId: 't1',
        status: 'APPROVED',
        currentStage: 2,
      },
      priorActions: [],
    });
    await expect(
      engine.applyAction(twoStageWorkflow, 'i1', {
        tenantId: 't1',
        actorUserId: 'u-a',
        decision: 'APPROVED',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('WorkflowEngineService.escalateOverdue (SLA §12)', () => {
  it('flags overdue instances and audits the escalation', async () => {
    const overdue = {
      id: 'i1',
      tenantId: 't1',
      module: 'LEAVES',
      entityName: 'leave_request',
      entityId: 'lr1',
      currentStage: 1,
    };
    const prisma = {
      workflowInstance: {
        findMany: jest.fn().mockResolvedValue([overdue]),
        update: jest.fn().mockResolvedValue(overdue),
      },
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const engine = new WorkflowEngineService(
      prisma as never,
      auditService as never,
    );

    await expect(engine.escalateOverdue()).resolves.toBe(1);
    expect(prisma.workflowInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'i1' } }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'WORKFLOW_ESCALATED' }),
    );
  });
});
