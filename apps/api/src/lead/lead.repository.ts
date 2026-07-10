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
  ): Promise<any[]> {
    const takeNum = take ? Number(take) : 50;
    const limit = Math.min(takeNum, 100);
    const cursorStr = cursor as string;

    return this.delegate.findMany({
      where: { tenantId },
      include: {
        ownerUser: true,
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
        ownerUser: true,
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
  ): Promise<any[]> {
    const takeNum = take ? Number(take) : 50;
    const limit = Math.min(takeNum, 100);

    return this.delegate.findMany({
      where: { tenantId },
      include: {
        pipelineStage: true,
        ownerUser: true,
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
