import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Lead, PipelineStage, Prisma } from '@prisma/client';
import { PrismaRepository, IPrismaService } from '@pingforce-monorepo/shared';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

// Safe projection for User relations — never expose passwordHash/tokenVersion
const SAFE_USER_SELECT = {
  select: {
    id: true,
    email: true,
    phone: true,
    status: true,
    profile: { select: { firstName: true, lastName: true } },
  },
} as const;

const DEFAULT_PAGE = 50;
const MAX_PAGE = 100;

/** Lead foreign keys that must point at rows in the same tenant. */
export type LeadReferenceKind =
  | 'pipelineStageId'
  | 'statusId'
  | 'sourceId'
  | 'campaignId'
  | 'priorityId'
  | 'ownerUserId';

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === code
  );
}

function pageSize(take?: number): number {
  return take && take > 0 ? Math.min(Math.floor(take), MAX_PAGE) : DEFAULT_PAGE;
}

@Injectable()
export class LeadRepository extends PrismaRepository<
  Lead,
  CreateLeadDto,
  UpdateLeadDto,
  Prisma.LeadDelegate
> {
  constructor(
    @Inject('IPrismaService') private readonly prismaClient: IPrismaService,
  ) {
    super(prismaClient.lead);
  }

  /** Creates a lead stamped with its tenant and creator. */
  async createLead(
    tenantId: string,
    data: CreateLeadDto,
    createdBy: string,
  ): Promise<Lead> {
    try {
      return await this.delegate.create({
        data: { ...data, tenantId, createdBy, updatedBy: createdBy },
      });
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new BadRequestException('Lead number already exists');
      }
      throw error;
    }
  }

  override async findAll(
    tenantId: string,
    cursor?: string | number,
    take?: number,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<Lead[]> {
    const cursorStr = typeof cursor === 'string' ? cursor : undefined;
    return this.delegate.findMany({
      where: { tenantId, ...scopeWhere },
      include: { ownerUser: SAFE_USER_SELECT },
      take: pageSize(take),
      ...(cursorStr && { skip: 1, cursor: { id: cursorStr } }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  /** One lead inside the tenant and the caller's scope, or null. */
  async findVisible(
    tenantId: string,
    id: string,
    scopeWhere: Record<string, unknown>,
  ): Promise<Lead | null> {
    return this.delegate.findFirst({
      where: { ...scopeWhere, id, tenantId },
      include: {
        ownerUser: SAFE_USER_SELECT,
        pipelineStage: true,
        status: true,
        source: true,
        priority: true,
      },
    });
  }

  async getPipeline(
    tenantId: string,
    cursor?: string,
    take?: number,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<Lead[]> {
    return this.delegate.findMany({
      where: { tenantId, ...scopeWhere },
      include: {
        pipelineStage: true,
        ownerUser: SAFE_USER_SELECT,
      },
      take: pageSize(take),
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async updateLead(
    tenantId: string,
    id: string,
    data: Prisma.LeadUncheckedUpdateInput,
  ): Promise<Lead> {
    return this.update(tenantId, id, data as UpdateLeadDto);
  }

  async findByLeadNumber(
    tenantId: string,
    leadNumber: string,
  ): Promise<{ id: string } | null> {
    return this.delegate.findFirst({
      where: { tenantId, leadNumber },
      select: { id: true },
    });
  }

  /** The tenant's pipeline stages in board order. */
  async listStages(tenantId: string): Promise<PipelineStage[]> {
    return this.prismaClient.pipelineStage.findMany({
      where: { tenantId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Inserts stages, skipping ids that already exist. With deterministic ids
   * this makes seeding the defaults idempotent under concurrent first loads.
   */
  async createStages(
    rows: readonly Prisma.PipelineStageCreateManyInput[],
  ): Promise<void> {
    await this.prismaClient.pipelineStage.createMany({
      data: [...rows],
      skipDuplicates: true,
    });
  }

  async createStage(
    tenantId: string,
    name: string,
    order: number,
    createdBy: string,
  ): Promise<PipelineStage> {
    return this.prismaClient.pipelineStage.create({
      data: { tenantId, name, order, createdBy, updatedBy: createdBy },
    });
  }

  async updateStageRow(
    tenantId: string,
    id: string,
    data: { name?: string; order?: number; updatedBy: string },
  ): Promise<PipelineStage> {
    return this.prismaClient.pipelineStage.update({
      where: { id_tenantId: { id, tenantId } },
      data,
    });
  }

  /** Writes order 1..n in one transaction so the board never sees a mix. */
  async reorderStages(
    tenantId: string,
    orderedIds: readonly string[],
    updatedBy: string,
  ): Promise<void> {
    await this.prismaClient.$transaction(
      orderedIds.map((id, index) =>
        this.prismaClient.pipelineStage.update({
          where: { id_tenantId: { id, tenantId } },
          data: { order: index + 1, updatedBy },
        }),
      ),
    );
  }

  async countLeadsInStage(tenantId: string, stageId: string): Promise<number> {
    return this.delegate.count({
      where: { tenantId, pipelineStageId: stageId },
    });
  }

  /** Soft delete via the Prisma extension (deletedAt = now()). */
  async deleteStage(tenantId: string, id: string): Promise<PipelineStage> {
    return this.prismaClient.pipelineStage.delete({
      where: { id_tenantId: { id, tenantId } },
    });
  }

  /** True when the referenced row exists in this tenant (and is not deleted). */
  async referenceExists(
    kind: LeadReferenceKind,
    tenantId: string,
    id: string,
  ): Promise<boolean> {
    const where = { id, tenantId };
    const count = await (() => {
      switch (kind) {
        case 'pipelineStageId':
          return this.prismaClient.pipelineStage.count({ where });
        case 'statusId':
          return this.prismaClient.leadStatus.count({ where });
        case 'sourceId':
          return this.prismaClient.leadSource.count({ where });
        case 'campaignId':
          return this.prismaClient.campaign.count({ where });
        case 'priorityId':
          return this.prismaClient.leadPriority.count({ where });
        case 'ownerUserId':
          return this.prismaClient.user.count({ where });
      }
    })();
    return count > 0;
  }
}
