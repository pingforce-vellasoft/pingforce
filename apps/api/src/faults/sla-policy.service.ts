import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateSlaPolicyDto } from './dto/create-sla-policy.dto';
import { UpdateSlaPolicyDto } from './dto/update-sla-policy.dto';
import { IPrismaService } from '@pingforce-monorepo/shared';

@Injectable()
export class SlaPolicyService {
  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService,
  ) {}

  async create(tenantId: string, dto: CreateSlaPolicyDto) {
    return await this.prisma.slaPolicy.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, skip?: number, take?: number) {
    return await this.prisma.slaPolicy.findMany({
      where: { tenantId },
      include: {
        escalationUser: {
          select: {
            id: true,
            employee: { select: { firstName: true, lastName: true } },
          },
        },
      },
      skip,
      take,
    });
  }

  async findOne(tenantId: string, id: string) {
    const policy = await this.prisma.slaPolicy.findUnique({
      where: { id_tenantId: { id, tenantId } },
    });
    if (!policy) {
      throw new NotFoundException(`SLA Policy with ID ${id} not found`);
    }
    return policy;
  }

  async findByPriority(tenantId: string, priority: string) {
    return await this.prisma.slaPolicy.findUnique({
      where: { tenantId_priority: { tenantId, priority } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateSlaPolicyDto) {
    try {
      return await this.prisma.slaPolicy.update({
        where: { id_tenantId: { id, tenantId } },
        data: dto,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`SLA Policy with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      return await this.prisma.slaPolicy.delete({
        where: { id_tenantId: { id, tenantId } },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`SLA Policy with ID ${id} not found`);
      }
      throw error;
    }
  }
}
