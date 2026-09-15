import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { Prisma, SlaPolicy } from '@prisma/client';

const SLA_POLICY_INCLUDE = {
  escalationUser: {
    select: {
      id: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

type SlaPolicyWithEscalationUser = Prisma.SlaPolicyGetPayload<{
  include: typeof SLA_POLICY_INCLUDE;
}>;

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

@Injectable()
export class SlaPolicyService {
  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService,
  ) {}

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateSlaPolicyDto,
  ): Promise<SlaPolicy> {
    await this.assertEscalationUser(tenantId, dto.escalateToId);

    const existing = await this.prisma.slaPolicy.findUnique({
      where: { tenantId_priority: { tenantId, priority: dto.priority } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        `An SLA policy for ${dto.priority} already exists`,
      );
    }

    if (existing) {
      return this.prisma.slaPolicy.update({
        where: { id_tenantId: { id: existing.id, tenantId } },
        data: {
          resolveInHours: dto.resolveInHours,
          escalateToId: dto.escalateToId ?? null,
          deletedAt: null,
          updatedBy: actorUserId,
        },
      });
    }

    try {
      return await this.prisma.slaPolicy.create({
        data: {
          ...dto,
          tenantId,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException(
          `An SLA policy for ${dto.priority} already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    skip?: number,
    take?: number,
  ): Promise<SlaPolicyWithEscalationUser[]> {
    return this.prisma.slaPolicy.findMany({
      where: { tenantId, deletedAt: null },
      include: SLA_POLICY_INCLUDE,
      skip,
      take: take ?? 25,
      orderBy: { priority: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<SlaPolicy> {
    const policy = await this.prisma.slaPolicy.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!policy) {
      throw new NotFoundException(`SLA Policy with ID ${id} not found`);
    }
    return policy;
  }

  async findByPriority(
    tenantId: string,
    priority: string,
  ): Promise<SlaPolicy | null> {
    return this.prisma.slaPolicy.findFirst({
      where: { tenantId, priority, deletedAt: null },
    });
  }

  async update(
    tenantId: string,
    id: string,
    actorUserId: string,
    dto: UpdateSlaPolicyDto,
  ): Promise<SlaPolicy> {
    await this.findOne(tenantId, id);
    if (dto.escalateToId !== undefined) {
      await this.assertEscalationUser(tenantId, dto.escalateToId ?? undefined);
    }

    try {
      return await this.prisma.slaPolicy.update({
        where: { id_tenantId: { id, tenantId } },
        data: { ...dto, updatedBy: actorUserId },
      });
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2025')) {
        throw new NotFoundException(`SLA Policy with ID ${id} not found`);
      }
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException(
          `An SLA policy for ${dto.priority} already exists`,
        );
      }
      throw error;
    }
  }

  async remove(
    tenantId: string,
    id: string,
    actorUserId: string,
  ): Promise<SlaPolicy> {
    await this.findOne(tenantId, id);
    return this.prisma.slaPolicy.update({
      where: { id_tenantId: { id, tenantId } },
      data: { deletedAt: new Date(), updatedBy: actorUserId },
    });
  }

  /** Prevent a tenant from routing escalation to another tenant's user. */
  private async assertEscalationUser(
    tenantId: string,
    userId?: string,
  ): Promise<void> {
    if (!userId) return;
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(
        'Escalation user is inactive or does not belong to this tenant',
      );
    }
  }
}
