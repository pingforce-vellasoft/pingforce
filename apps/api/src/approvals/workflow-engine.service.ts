import { Injectable, Inject, ConflictException, Logger } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';

/** Conditional-routing rule (ApprovalWorkflow.md §11). */
export interface WorkflowCondition {
  readonly field: string;
  readonly op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
  readonly value: unknown;
}

export interface WorkflowStageDef {
  readonly id: string;
  readonly stageNumber: number;
  readonly stageName: string;
  readonly approvalMode: string;
  readonly minimumApprovals: number;
  readonly requiredAction: string;
  readonly approverRoleId: string | null;
  readonly approverUserId: string | null;
  readonly slaHours: number | null;
}

export interface ActiveWorkflow {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly module: string;
  readonly entityName: string;
  readonly stages: readonly WorkflowStageDef[];
}

export interface EngineActionInput {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly decision: 'APPROVED' | 'REJECTED';
  readonly notes?: string;
  /** Delegator userId when the actor acts under a delegation (§13). */
  readonly actedAsDelegateOf?: string;
}

export interface EngineOutcome {
  readonly instanceId: string;
  /** True when the instance reached a terminal state with this action. */
  readonly finalized: boolean;
  readonly status: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';
  /** Stage the action was recorded against. */
  readonly stageNumber: number;
  readonly stageName: string;
  /** Populated while more stages remain. */
  readonly nextStageNumber?: number;
  readonly nextStageName?: string;
  readonly totalStages: number;
}

/**
 * Multi-stage workflow engine (2.11_WorkflowEngine/ApprovalWorkflow.md).
 *
 * Owns workflow definition matching (incl. conditional routing §11),
 * instance lifecycle (§6), sequential/parallel stage advancement (§8),
 * delegation lookup (§13) and per-action audit history (§19). Stage-level
 * authorization stays in ApprovalsService so RBAC/data-scope/self-approval
 * rules are identical for single-stage and multi-stage paths.
 */
@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Picks the active definition routing this entity, or null when the
   * module runs single-stage. Definitions with conditions are evaluated
   * against `context`; the first match wins (conditional definitions are
   * checked before unconditional fallbacks).
   */
  async findActiveWorkflow(
    tenantId: string,
    module: string,
    entityName: string,
    context?: Record<string, unknown>,
  ): Promise<ActiveWorkflow | null> {
    const definitions = await this.prisma.workflowDefinition.findMany({
      where: { tenantId, module, entityName, active: true, deletedAt: null },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
    if (definitions.length === 0) return null;

    const conditional = definitions.filter(
      (d) => Array.isArray(d.conditions) && d.conditions.length > 0,
    );
    const unconditional = definitions.filter(
      (d) => !Array.isArray(d.conditions) || d.conditions.length === 0,
    );

    for (const def of [...conditional, ...unconditional]) {
      if (def.stages.length === 0) continue;
      if (
        this.conditionsMatch(
          def.conditions as unknown as WorkflowCondition[] | null,
          context ?? {},
        )
      ) {
        return {
          id: def.id,
          tenantId: def.tenantId,
          code: def.code,
          module: def.module,
          entityName: def.entityName,
          stages: def.stages,
        };
      }
    }
    return null;
  }

  /** All rules must match; malformed rules deny the route (fail closed). */
  private conditionsMatch(
    conditions: readonly WorkflowCondition[] | null,
    context: Record<string, unknown>,
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every((rule) => {
      if (!rule || typeof rule.field !== 'string') return false;
      const actual = context[rule.field];
      switch (rule.op) {
        case 'eq':
          return actual === rule.value;
        case 'neq':
          return actual !== rule.value;
        case 'gt':
          return Number(actual) > Number(rule.value);
        case 'gte':
          return Number(actual) >= Number(rule.value);
        case 'lt':
          return Number(actual) < Number(rule.value);
        case 'lte':
          return Number(actual) <= Number(rule.value);
        case 'in':
          return Array.isArray(rule.value) && rule.value.includes(actual);
        default:
          return false;
      }
    });
  }

  /** Returns the open instance for the entity, creating one at stage 1. */
  async getOrCreateInstance(
    workflow: ActiveWorkflow,
    entityId: string,
    ownerEmployeeId: string,
    context?: Record<string, unknown>,
  ) {
    const existing = await this.prisma.workflowInstance.findFirst({
      where: {
        tenantId: workflow.tenantId,
        entityName: workflow.entityName,
        entityId,
        status: 'IN_PROGRESS',
      },
    });
    if (existing) return existing;

    const firstStage = workflow.stages[0];
    return this.prisma.workflowInstance.create({
      data: {
        tenantId: workflow.tenantId,
        workflowId: workflow.id,
        module: workflow.module,
        entityName: workflow.entityName,
        entityId,
        ownerEmployeeId,
        currentStage: firstStage.stageNumber,
        context: (context ?? undefined) as never,
        slaDueAt: this.slaDueAt(firstStage),
      },
    });
  }

  /**
   * Active delegation granting `delegateUserId` the delegator's authority
   * for this module (NULL module rows apply everywhere) — §13.
   */
  async findDelegationFor(
    tenantId: string,
    delegateUserId: string,
    module: string,
  ): Promise<{ delegatorUserId: string } | null> {
    const now = new Date();
    return this.prisma.workflowDelegation.findFirst({
      where: {
        tenantId,
        delegateUserId,
        deletedAt: null,
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [{ module: null }, { module }],
      },
      select: { delegatorUserId: true },
    });
  }

  /**
   * Records the action and advances/completes the instance (§8/§10).
   * PARALLEL stages advance once `minimumApprovals` distinct approvers have
   * approved; any rejection is terminal at any stage.
   */
  async applyAction(
    workflow: ActiveWorkflow,
    instanceId: string,
    input: EngineActionInput,
  ): Promise<EngineOutcome> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.findFirst({
        where: { id: instanceId, tenantId: input.tenantId },
      });
      if (!instance || instance.status !== 'IN_PROGRESS') {
        throw new ConflictException('Workflow instance is not in progress');
      }

      const stage = workflow.stages.find(
        (s) => s.stageNumber === instance.currentStage,
      );
      if (!stage) {
        throw new ConflictException('Current workflow stage not found');
      }

      // One vote per approver per stage (parallel double-approve guard)
      const alreadyActed = await tx.workflowAction.findFirst({
        where: {
          instanceId: instance.id,
          stageNumber: stage.stageNumber,
          actorUserId: input.actorUserId,
        },
        select: { id: true },
      });
      if (alreadyActed) {
        throw new ConflictException('You have already acted on this stage');
      }

      await tx.workflowAction.create({
        data: {
          tenantId: input.tenantId,
          instanceId: instance.id,
          stageNumber: stage.stageNumber,
          actorUserId: input.actorUserId,
          decision: input.decision,
          notes: input.notes,
          actedAsDelegateOf: input.actedAsDelegateOf,
        },
      });

      const totalStages = workflow.stages.length;

      if (input.decision === 'REJECTED') {
        await tx.workflowInstance.update({
          where: { id: instance.id },
          data: { status: 'REJECTED', completedAt: new Date() },
        });
        return {
          instanceId: instance.id,
          finalized: true,
          status: 'REJECTED' as const,
          stageNumber: stage.stageNumber,
          stageName: stage.stageName,
          totalStages,
        };
      }

      if (stage.approvalMode === 'PARALLEL') {
        const approvals = await tx.workflowAction.count({
          where: {
            instanceId: instance.id,
            stageNumber: stage.stageNumber,
            decision: 'APPROVED',
          },
        });
        if (approvals < stage.minimumApprovals) {
          return {
            instanceId: instance.id,
            finalized: false,
            status: 'IN_PROGRESS' as const,
            stageNumber: stage.stageNumber,
            stageName: stage.stageName,
            nextStageNumber: stage.stageNumber,
            nextStageName: stage.stageName,
            totalStages,
          };
        }
      }

      const stageIndex = workflow.stages.findIndex(
        (s) => s.stageNumber === stage.stageNumber,
      );
      const nextStage = workflow.stages[stageIndex + 1];

      if (!nextStage) {
        await tx.workflowInstance.update({
          where: { id: instance.id },
          data: { status: 'APPROVED', completedAt: new Date() },
        });
        return {
          instanceId: instance.id,
          finalized: true,
          status: 'APPROVED' as const,
          stageNumber: stage.stageNumber,
          stageName: stage.stageName,
          totalStages,
        };
      }

      await tx.workflowInstance.update({
        where: { id: instance.id },
        data: {
          currentStage: nextStage.stageNumber,
          slaDueAt: this.slaDueAt(nextStage),
          escalatedAt: null,
        },
      });
      return {
        instanceId: instance.id,
        finalized: false,
        status: 'IN_PROGRESS' as const,
        stageNumber: stage.stageNumber,
        stageName: stage.stageName,
        nextStageNumber: nextStage.stageNumber,
        nextStageName: nextStage.stageName,
        totalStages,
      };
    });

    void this.auditService.log({
      tenantId: input.tenantId,
      actorId: input.actorUserId,
      module: workflow.module,
      entityName: workflow.entityName,
      entityId: outcome.instanceId,
      action: `WORKFLOW_STAGE_${input.decision}`,
      newValue: {
        workflowCode: workflow.code,
        stageNumber: outcome.stageNumber,
        stageName: outcome.stageName,
        finalized: outcome.finalized,
        ...(input.actedAsDelegateOf && {
          actedAsDelegateOf: input.actedAsDelegateOf,
        }),
        ...(input.notes && { notes: input.notes }),
      },
    });

    return outcome;
  }

  /** Cancels the open instance for an entity (owner withdrew the request). */
  async cancelInstance(
    tenantId: string,
    entityName: string,
    entityId: string,
    actorUserId: string,
  ): Promise<void> {
    const { count } = await this.prisma.workflowInstance.updateMany({
      where: { tenantId, entityName, entityId, status: 'IN_PROGRESS' },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
    if (count > 0) {
      void this.auditService.log({
        tenantId,
        actorId: actorUserId,
        module: 'WORKFLOWS',
        entityName,
        entityId,
        action: 'WORKFLOW_CANCELLED',
      });
    }
  }

  /** Full action history for an instance (§17). */
  async getHistory(tenantId: string, instanceId: string) {
    return this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      include: {
        workflow: {
          select: { code: true, name: true, module: true, entityName: true },
        },
        actions: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  /**
   * SLA sweep (§12): flags in-progress instances past their stage SLA.
   * Escalation is audited (severity MEDIUM) so it feeds monitoring/alerts.
   */
  async escalateOverdue(): Promise<number> {
    const now = new Date();
    const overdue = await this.prisma.workflowInstance.findMany({
      where: {
        status: 'IN_PROGRESS',
        escalatedAt: null,
        slaDueAt: { not: null, lt: now },
      },
      select: {
        id: true,
        tenantId: true,
        module: true,
        entityName: true,
        entityId: true,
        currentStage: true,
      },
      take: 500,
    });

    for (const instance of overdue) {
      await this.prisma.workflowInstance.update({
        where: { id: instance.id },
        data: { escalatedAt: now },
      });
      void this.auditService.log({
        tenantId: instance.tenantId,
        module: instance.module,
        entityName: instance.entityName,
        entityId: instance.entityId,
        action: 'WORKFLOW_ESCALATED',
        severity: 'MEDIUM',
        newValue: { instanceId: instance.id, stage: instance.currentStage },
      });
    }
    if (overdue.length > 0) {
      this.logger.warn(`Escalated ${overdue.length} overdue workflow(s)`);
    }
    return overdue.length;
  }

  private slaDueAt(stage: WorkflowStageDef): Date | null {
    if (!stage.slaHours || stage.slaHours <= 0) return null;
    return new Date(Date.now() + stage.slaHours * 3_600_000);
  }
}
