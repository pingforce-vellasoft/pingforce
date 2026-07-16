import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';
import { RbacService } from '../rbac/rbac.service';
import {
  WorkflowEngineService,
  ActiveWorkflow,
  WorkflowStageDef,
} from './workflow-engine.service';

export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export interface ApprovalRequest {
  readonly tenantId: string;
  /** Business module the entity belongs to (LEAVES, CLAIMS, ATTENDANCE, ...) */
  readonly module: string;
  readonly entityName: string;
  readonly entityId: string;
  /** Employee who owns the record awaiting approval */
  readonly ownerEmployeeId: string;
  /** Authenticated user acting on the request */
  readonly actorUserId: string;
  readonly decision: ApprovalDecision;
  readonly notes?: string;
  /** RBAC action that authorizes this decision (usually 'APPROVE') */
  readonly requiredAction?: string;
  /** Conditional-routing context (ApprovalWorkflow.md §11), e.g. { amount } */
  readonly context?: Record<string, unknown>;
}

/**
 * Result of an approval decision. `finalized: false` means the entity moved
 * to the next workflow stage — the module's state change (`apply`) has NOT
 * run and the record stays pending for the next approver.
 */
export interface ApprovalOutcome<T> {
  readonly finalized: boolean;
  readonly decision: ApprovalDecision;
  readonly result?: T;
  /** Multi-stage metadata (absent on the single-stage fallback path). */
  readonly instanceId?: string;
  readonly stageNumber?: number;
  readonly stageName?: string;
  readonly nextStageNumber?: number;
  readonly nextStageName?: string;
  readonly totalStages?: number;
}

/**
 * Shared approval engine (2.11_WorkflowEngine/ApprovalWorkflow.md).
 *
 * Every decision enforces approver authorization via RBAC + data scope (§9)
 * and the conflict-of-interest block (approvers never approve their own
 * records), with immutable audit history (§2). When the tenant has an
 * active WorkflowDefinition for the entity, decisions route through the
 * multi-stage engine (sequential/parallel stages, conditional routing,
 * delegation, SLA); otherwise the original single-stage path applies.
 */
@Injectable()
export class ApprovalsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
    private readonly rbacService: RbacService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  /**
   * Validates that the actor may decide on the entity, then records the
   * decision in the audit trail. Callers apply the module-specific state
   * change themselves (inside their own transaction) after this resolves.
   */
  async authorizeDecision(
    request: ApprovalRequest,
    authorityUserId?: string,
  ): Promise<void> {
    // The authority is whose grants are checked — the actor themselves, or
    // the delegator when acting under a delegation (ApprovalWorkflow.md §13)
    const authority = authorityUserId ?? request.actorUserId;

    // 1. RBAC: authority must hold module:APPROVE (defense in depth — the
    //    controller guard already checks, this protects service-level calls)
    const action = request.requiredAction ?? 'APPROVE';
    const allowed = await this.rbacService.hasPermission(
      authority,
      request.module,
      action,
    );
    if (!allowed) {
      throw new ForbiddenException(
        `Missing ${request.module}:${action} permission`,
      );
    }

    // 2. Approver resolution scope (ApprovalWorkflow.md §9, DataScope.md §4):
    //    the record owner must fall inside the authority's resolved data
    //    scope — TEAM (direct + indirect reports), DEPARTMENT, BRANCH,
    //    REGION, BUSINESS_UNIT and CUSTOM all enforce membership; ALL passes.
    const scope = await this.rbacService.resolveScopeIds(
      request.tenantId,
      authority,
      request.module,
      [action],
    );

    const actorEmployee = await this.prisma.employee.findFirst({
      where: {
        tenantId: request.tenantId,
        userId: request.actorUserId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (scope.kind !== 'ALL') {
      const owner = await this.prisma.employee.findFirst({
        where: {
          id: request.ownerEmployeeId,
          tenantId: request.tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!owner) {
        throw new NotFoundException('Record owner not found');
      }
      if (
        scope.kind === 'NONE' ||
        !scope.employeeIds.includes(request.ownerEmployeeId)
      ) {
        throw new ForbiddenException(
          'You may only approve requests within your data scope',
        );
      }
    }

    // 3. Conflict of interest: nobody decides on their own record — not even
    //    a delegate acting for someone else while owning the record.
    if (actorEmployee && actorEmployee.id === request.ownerEmployeeId) {
      throw new ForbiddenException('You cannot approve your own request');
    }
  }

  /** Records the decision in the immutable audit trail (§2, §19). */
  async recordDecision(request: ApprovalRequest): Promise<void> {
    await this.auditService.log({
      tenantId: request.tenantId,
      actorId: request.actorUserId,
      module: request.module,
      entityName: request.entityName,
      entityId: request.entityId,
      action: `WORKFLOW_${request.decision}`,
      severity: 'INFO',
      newValue: {
        decision: request.decision,
        ownerEmployeeId: request.ownerEmployeeId,
        ...(request.notes && { notes: request.notes }),
      },
    });
  }

  /**
   * Routes a decision through the tenant's configured workflow. `apply`
   * (the module's state change) runs only when the decision finalizes the
   * request — final-stage approval or any rejection. Intermediate approvals
   * advance the instance and leave the record pending.
   */
  async process<T>(
    request: ApprovalRequest,
    apply: () => Promise<T>,
  ): Promise<ApprovalOutcome<T>> {
    const workflow = await this.workflowEngine.findActiveWorkflow(
      request.tenantId,
      request.module,
      request.entityName,
      request.context,
    );

    if (!workflow) {
      // Single-stage fallback — original behavior, zero regression
      await this.authorizeDecision(request);
      const result = await apply();
      await this.recordDecision(request);
      return { finalized: true, decision: request.decision, result };
    }

    return this.processStaged(workflow, request, apply);
  }

  private async processStaged<T>(
    workflow: ActiveWorkflow,
    request: ApprovalRequest,
    apply: () => Promise<T>,
  ): Promise<ApprovalOutcome<T>> {
    const instance = await this.workflowEngine.getOrCreateInstance(
      workflow,
      request.entityId,
      request.ownerEmployeeId,
      request.context,
    );

    const stage = workflow.stages.find(
      (s) => s.stageNumber === instance.currentStage,
    );
    if (!stage) {
      throw new NotFoundException('Current workflow stage not found');
    }

    const delegatorUserId = await this.authorizeStage(request, stage);

    const engineOutcome = await this.workflowEngine.applyAction(
      workflow,
      instance.id,
      {
        tenantId: request.tenantId,
        actorUserId: request.actorUserId,
        decision: request.decision,
        notes: request.notes,
        actedAsDelegateOf: delegatorUserId ?? undefined,
      },
    );

    let result: T | undefined;
    if (engineOutcome.finalized) {
      result = await apply();
      await this.recordDecision(request);
    }

    return {
      finalized: engineOutcome.finalized,
      decision: request.decision,
      result,
      instanceId: engineOutcome.instanceId,
      stageNumber: engineOutcome.stageNumber,
      stageName: engineOutcome.stageName,
      nextStageNumber: engineOutcome.nextStageNumber,
      nextStageName: engineOutcome.nextStageName,
      totalStages: engineOutcome.totalStages,
    };
  }

  /**
   * Stage-level authorization (§8/§9): static user/role constraints plus the
   * standard RBAC + data-scope + self-approval checks. When the actor fails
   * directly but holds an active delegation, authorization retries with the
   * delegator's authority; returns the delegator userId in that case.
   */
  private async authorizeStage(
    request: ApprovalRequest,
    stage: WorkflowStageDef,
  ): Promise<string | null> {
    const stageRequest: ApprovalRequest = {
      ...request,
      requiredAction: stage.requiredAction,
    };

    const delegation = await this.workflowEngine.findDelegationFor(
      request.tenantId,
      request.actorUserId,
      request.module,
    );

    // Static approver constraint (§9): only the named user (or their active
    // delegate) may act on this stage
    if (stage.approverUserId) {
      const isNamedUser = request.actorUserId === stage.approverUserId;
      const isDelegateOfNamed =
        delegation?.delegatorUserId === stage.approverUserId;
      if (!isNamedUser && !isDelegateOfNamed) {
        throw new ForbiddenException(
          'This stage is assigned to a specific approver',
        );
      }
      await this.authorizeDecision(
        stageRequest,
        isNamedUser ? undefined : delegation?.delegatorUserId,
      );
      return isNamedUser ? null : (delegation?.delegatorUserId ?? null);
    }

    // Role constraint (§9): actor (or delegator) must hold the stage role
    if (stage.approverRoleId) {
      const holdsRole = await this.userHoldsRole(
        request.tenantId,
        request.actorUserId,
        stage.approverRoleId,
      );
      if (holdsRole) {
        await this.authorizeDecision(stageRequest);
        return null;
      }
      if (delegation) {
        const delegatorHoldsRole = await this.userHoldsRole(
          request.tenantId,
          delegation.delegatorUserId,
          stage.approverRoleId,
        );
        if (delegatorHoldsRole) {
          await this.authorizeDecision(
            stageRequest,
            delegation.delegatorUserId,
          );
          return delegation.delegatorUserId;
        }
      }
      throw new ForbiddenException(
        'This stage requires a specific approver role',
      );
    }

    // Permission-based stage: try the actor first, then their delegation
    try {
      await this.authorizeDecision(stageRequest);
      return null;
    } catch (error) {
      if (!(error instanceof ForbiddenException) || !delegation) {
        throw error;
      }
      await this.authorizeDecision(stageRequest, delegation.delegatorUserId);
      return delegation.delegatorUserId;
    }
  }

  private async userHoldsRole(
    tenantId: string,
    userId: string,
    roleId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, roleId, deletedAt: null },
      select: { id: true },
    });
    return user !== null;
  }
}
