import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowStageDto,
} from './dto/create-workflow.dto';
import { CreateDelegationDto } from './dto/create-delegation.dto';

/**
 * Workflow definition + delegation administration
 * (2.11_WorkflowEngine/ApprovalWorkflow.md §7/§8/§13/§17).
 * Runtime evaluation lives in WorkflowEngineService.
 */
@Injectable()
export class WorkflowsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.workflowDefinition.findMany({
      where: { tenantId, deletedAt: null },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
      orderBy: [{ module: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
    });
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }
    return workflow;
  }

  async create(tenantId: string, actorUserId: string, dto: CreateWorkflowDto) {
    this.validateStages(dto.stages);

    const existing = await this.prisma.workflowDefinition.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`Workflow code ${dto.code} already exists`);
    }

    const workflow = await this.prisma.workflowDefinition.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        module: dto.module,
        entityName: dto.entityName,
        active: dto.active ?? false,
        conditions: (dto.conditions ?? undefined) as never,
        createdBy: actorUserId,
        stages: {
          create: dto.stages.map((s) => this.toStageData(tenantId, s)),
        },
      },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
    });

    void this.auditService.log({
      tenantId,
      actorId: actorUserId,
      module: 'WORKFLOWS',
      entityName: 'workflow_definition',
      entityId: workflow.id,
      action: 'WORKFLOW_CREATED',
      newValue: {
        code: dto.code,
        module: dto.module,
        stages: dto.stages.length,
      },
    });

    return workflow;
  }

  /**
   * Updates a definition. Replacing stages while instances are in flight is
   * rejected — deactivate first, let instances drain, then edit.
   */
  async update(
    tenantId: string,
    id: string,
    actorUserId: string,
    dto: UpdateWorkflowDto,
  ) {
    const workflow = await this.findOne(tenantId, id);

    if (dto.stages) {
      this.validateStages(dto.stages);
      const inFlight = await this.prisma.workflowInstance.count({
        where: { tenantId, workflowId: id, status: 'IN_PROGRESS' },
      });
      if (inFlight > 0) {
        throw new ConflictException(
          `Cannot replace stages while ${inFlight} instance(s) are in progress`,
        );
      }
    }

    const updated = await this.prisma.workflowDefinition.update({
      where: { id: workflow.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.conditions !== undefined && {
          conditions: dto.conditions as never,
        }),
        ...(dto.stages && { version: { increment: 1 } }),
        updatedBy: actorUserId,
        ...(dto.stages && {
          stages: {
            deleteMany: {},
            create: dto.stages.map((s) => this.toStageData(tenantId, s)),
          },
        }),
      },
      include: { stages: { orderBy: { stageNumber: 'asc' } } },
    });

    void this.auditService.log({
      tenantId,
      actorId: actorUserId,
      module: 'WORKFLOWS',
      entityName: 'workflow_definition',
      entityId: id,
      action: 'WORKFLOW_UPDATED',
      newValue: {
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.stages && { stages: dto.stages.length }),
      },
    });

    return updated;
  }

  async setActive(
    tenantId: string,
    id: string,
    actorUserId: string,
    active: boolean,
  ) {
    await this.findOne(tenantId, id);
    const updated = await this.prisma.workflowDefinition.update({
      where: { id },
      data: { active, updatedBy: actorUserId },
    });
    void this.auditService.log({
      tenantId,
      actorId: actorUserId,
      module: 'WORKFLOWS',
      entityName: 'workflow_definition',
      entityId: id,
      action: active ? 'WORKFLOW_ACTIVATED' : 'WORKFLOW_DEACTIVATED',
    });
    return updated;
  }

  async remove(tenantId: string, id: string, actorUserId: string) {
    await this.findOne(tenantId, id);
    const removed = await this.prisma.workflowDefinition.update({
      where: { id },
      data: { active: false, deletedAt: new Date(), updatedBy: actorUserId },
    });
    void this.auditService.log({
      tenantId,
      actorId: actorUserId,
      module: 'WORKFLOWS',
      entityName: 'workflow_definition',
      entityId: id,
      action: 'WORKFLOW_ARCHIVED',
    });
    return removed;
  }

  // ── Delegations (§13) ─────────────────────────────────────────────────────

  async listDelegations(tenantId: string) {
    return this.prisma.workflowDelegation.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { endsAt: 'desc' },
    });
  }

  async createDelegation(
    tenantId: string,
    actorUserId: string,
    dto: CreateDelegationDto,
  ) {
    if (dto.delegatorUserId === dto.delegateUserId) {
      throw new BadRequestException('Cannot delegate to yourself');
    }
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    // Both parties must be users of this tenant
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: [dto.delegatorUserId, dto.delegateUserId] },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (users.length !== 2) {
      throw new NotFoundException('Delegator or delegate not found');
    }

    const delegation = await this.prisma.workflowDelegation.create({
      data: {
        tenantId,
        delegatorUserId: dto.delegatorUserId,
        delegateUserId: dto.delegateUserId,
        module: dto.module,
        reason: dto.reason,
        startsAt,
        endsAt,
        createdBy: actorUserId,
      },
    });

    void this.auditService.log({
      tenantId,
      actorId: actorUserId,
      module: 'WORKFLOWS',
      entityName: 'workflow_delegation',
      entityId: delegation.id,
      action: 'WORKFLOW_DELEGATED',
      newValue: {
        delegatorUserId: dto.delegatorUserId,
        delegateUserId: dto.delegateUserId,
        module: dto.module ?? 'ALL',
        endsAt: dto.endsAt,
      },
    });

    return delegation;
  }

  async revokeDelegation(tenantId: string, id: string, actorUserId: string) {
    const delegation = await this.prisma.workflowDelegation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }
    const revoked = await this.prisma.workflowDelegation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    void this.auditService.log({
      tenantId,
      actorId: actorUserId,
      module: 'WORKFLOWS',
      entityName: 'workflow_delegation',
      entityId: id,
      action: 'WORKFLOW_DELEGATION_REVOKED',
    });
    return revoked;
  }

  /** Stages must be contiguous starting at 1, with sane parallel quorums. */
  private validateStages(stages: readonly WorkflowStageDto[]): void {
    const numbers = [...stages].map((s) => s.stageNumber).sort((a, b) => a - b);
    numbers.forEach((n, i) => {
      if (n !== i + 1) {
        throw new BadRequestException(
          'Stage numbers must be contiguous starting at 1',
        );
      }
    });
    for (const stage of stages) {
      if (
        stage.approvalMode !== 'PARALLEL' &&
        (stage.minimumApprovals ?? 1) > 1
      ) {
        throw new BadRequestException(
          `Stage ${stage.stageNumber}: minimumApprovals > 1 requires PARALLEL mode`,
        );
      }
    }
  }

  private toStageData(tenantId: string, s: WorkflowStageDto) {
    return {
      tenantId,
      stageNumber: s.stageNumber,
      stageName: s.stageName,
      approvalMode: s.approvalMode ?? 'SEQUENTIAL',
      minimumApprovals: s.minimumApprovals ?? 1,
      requiredAction: s.requiredAction ?? 'APPROVE',
      approverRoleId: s.approverRoleId,
      approverUserId: s.approverUserId,
      slaHours: s.slaHours,
    };
  }
}
