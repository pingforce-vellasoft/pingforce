import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

/**
 * Plan catalog. Public reads power the website pricing page; writes are
 * Super-Admin only (guarded at the controller).
 */
@Injectable()
export class PlansService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  /** Active plans for the public pricing page, ordered for display. */
  async listPublic() {
    return this.prisma.plan.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { amount: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        tagline: true,
        amount: true,
        currency: true,
        interval: true,
        features: true,
        maxFieldStaff: true,
        highlighted: true,
        isCustom: true,
      },
    });
  }

  /** All plans (including inactive) for Super-Admin management. */
  async listAll() {
    return this.prisma.plan.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { amount: 'asc' }],
    });
  }

  async findByCode(code: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { code, deletedAt: null },
    });
    if (!plan) {
      throw new NotFoundException(`Plan not found: ${code}`);
    }
    return plan;
  }

  async create(dto: CreatePlanDto, userId?: string) {
    return this.prisma.plan.create({
      data: {
        code: dto.code,
        name: dto.name,
        tagline: dto.tagline ?? null,
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        interval: dto.interval ?? 'MONTHLY',
        features: dto.features,
        maxFieldStaff: dto.maxFieldStaff ?? null,
        highlighted: dto.highlighted ?? false,
        isCustom: dto.isCustom ?? false,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: userId ?? null,
      },
    });
  }

  async update(id: string, dto: UpdatePlanDto, userId?: string) {
    await this.ensureExists(id);
    return this.prisma.plan.update({
      where: { id },
      data: { ...dto, updatedBy: userId ?? null },
    });
  }

  async remove(id: string, userId?: string) {
    await this.ensureExists(id);
    return this.prisma.plan.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: userId ?? null,
      },
    });
  }

  private async ensureExists(id: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id, deletedAt: null },
    });
    if (!plan) {
      throw new NotFoundException(`Plan not found: ${id}`);
    }
    return plan;
  }
}
