import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';
import { RbacService } from '../rbac/rbac.service';

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
}

/**
 * Shared approval engine (2.11_WorkflowEngine/ApprovalWorkflow.md).
 *
 * Single-stage implementation of the spec's core guarantees — approver
 * authorization via RBAC + data scope (§9), conflict-of-interest block
 * (approvers never approve their own records), and immutable audit history
 * (§2). Multi-stage/conditional routing extends here later without touching
 * the calling modules (leave, claims, corrections, shifts — §3).
 */
@Injectable()
export class ApprovalsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
    private readonly rbacService: RbacService,
  ) {}

  /**
   * Validates that the actor may decide on the entity, then records the
   * decision in the audit trail. Callers apply the module-specific state
   * change themselves (inside their own transaction) after this resolves.
   */
  async authorizeDecision(request: ApprovalRequest): Promise<void> {
    // 1. RBAC: actor must hold module:APPROVE (defense in depth — the
    //    controller guard already checks, this protects service-level calls)
    const action = request.requiredAction ?? 'APPROVE';
    const allowed = await this.rbacService.hasPermission(
      request.actorUserId,
      request.module,
      action,
    );
    if (!allowed) {
      throw new ForbiddenException(
        `Missing ${request.module}:${action} permission`,
      );
    }

    // 2. Approver resolution scope (ApprovalWorkflow.md §9): TEAM-scoped
    //    approvers may only decide for their direct reports.
    const scope = await this.rbacService.getDataScope(
      request.actorUserId,
      request.module,
      action,
    );

    const actorEmployee = await this.prisma.employee.findFirst({
      where: {
        tenantId: request.tenantId,
        userId: request.actorUserId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (scope === 'TEAM') {
      const owner = await this.prisma.employee.findFirst({
        where: {
          id: request.ownerEmployeeId,
          tenantId: request.tenantId,
          deletedAt: null,
        },
        select: { reportingManagerId: true },
      });
      if (!owner) {
        throw new NotFoundException('Record owner not found');
      }
      if (!actorEmployee || owner.reportingManagerId !== actorEmployee.id) {
        throw new ForbiddenException(
          'You may only approve requests from your direct reports',
        );
      }
    }

    // 3. Conflict of interest: nobody decides on their own record
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

  /** Convenience: authorize, run the module's state change, then audit. */
  async process<T>(
    request: ApprovalRequest,
    apply: () => Promise<T>,
  ): Promise<T> {
    await this.authorizeDecision(request);
    const result = await apply();
    await this.recordDecision(request);
    return result;
  }
}
