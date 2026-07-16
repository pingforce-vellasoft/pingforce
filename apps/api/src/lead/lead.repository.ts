import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaRepository, IPrismaService } from '@pingforce-monorepo/shared';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { Prisma } from '@prisma/client';

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

@Injectable()
export class LeadRepository extends PrismaRepository<
  any,
  CreateLeadDto,
  UpdateLeadDto,
  Prisma.LeadDelegate<any>
> {
  constructor(
    @Inject('IPrismaService') private readonly prismaClient: IPrismaService,
  ) {
    super(prismaClient.lead);
  }

  override async findAll(
    tenantId: string,
    cursor?: string | number,
    take?: number,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<any[]> {
    const takeNum = take ? Number(take) : 50;
    const limit = Math.min(takeNum, 100);
    const cursorStr = cursor as string;

    return this.delegate.findMany({
      where: { tenantId, ...scopeWhere },
      include: {
        ownerUser: SAFE_USER_SELECT,
      },
      take: limit,
      ...(cursorStr && { skip: 1, cursor: { id: cursorStr } }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  override async findById(tenantId: string, id: string): Promise<any | null> {
    const lead = await this.delegate.findFirst({
      where: { id, tenantId },
      include: {
        ownerUser: SAFE_USER_SELECT,
      },
    });

    if (!lead) {
      return null;
    }

    return lead;
  }

  async getPipeline(
    tenantId: string,
    cursor?: string,
    take?: number,
    scopeWhere: Record<string, unknown> = {},
  ): Promise<any[]> {
    const takeNum = take ? Number(take) : 50;
    const limit = Math.min(takeNum, 100);

    return this.delegate.findMany({
      where: { tenantId, ...scopeWhere },
      include: {
        pipelineStage: true,
        ownerUser: SAFE_USER_SELECT,
      },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async assignOwner(
    tenantId: string,
    id: string,
    ownerUserId: string,
  ): Promise<any> {
    const user = await this.prismaClient.user.findFirst({
      where: { id: ownerUserId, tenantId },
    });
    if (!user)
      throw new BadRequestException(
        'Invalid user or does not belong to this tenant',
      );
    return this.update(tenantId, id, { ownerUserId } as any);
  }

  async updateStage(
    tenantId: string,
    id: string,
    pipelineStageId: string,
  ): Promise<any> {
    return this.update(tenantId, id, { pipelineStageId } as any);
  }
}
