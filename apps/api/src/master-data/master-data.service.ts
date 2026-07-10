import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMasterDataDto } from './dto/create-master-datum.dto';
import { UpdateMasterDataDto } from './dto/update-master-datum.dto';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const MODEL_MAP: Record<string, string> = {
  companies: 'company',
  departments: 'department',
  designations: 'designation',
  branches: 'branch',
  teams: 'team',
  'leave-types': 'leaveType',
  'lead-sources': 'leadSource',
  campaigns: 'campaign',
  'lead-priorities': 'leadPriority',
};

@Injectable()
export class MasterDataService {
  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private getModel(type: string) {
    const modelName = MODEL_MAP[type];
    if (!modelName) {
      throw new BadRequestException(`Invalid master data type: ${type}`);
    }
    return this.prisma[modelName as keyof IPrismaService] as any;
  }

  async create(
    tenantId: string,
    type: string,
    createMasterDataDto: CreateMasterDataDto,
  ) {
    const model = this.getModel(type);
    const result = await model.create({
      data: {
        tenantId,
        ...createMasterDataDto,
      },
    });

    // Invalidate cache
    await this.cacheManager.del(`master_data_${tenantId}_${type}`);

    return result;
  }

  async findAll(tenantId: string, type: string) {
    const cacheKey = `master_data_${tenantId}_${type}`;
    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const model = this.getModel(type);
    const data = await model.findMany({
      where: { tenantId },
    });

    await this.cacheManager.set(cacheKey, data, 600000); // 10 minutes TTL

    return data;
  }

  async findOne(tenantId: string, type: string, id: string) {
    const model = this.getModel(type);
    const result = await model.findFirst({
      where: { id, tenantId },
    });
    if (!result) {
      throw new NotFoundException(`${type} with ID ${id} not found`);
    }
    return result;
  }

  async update(
    tenantId: string,
    type: string,
    id: string,
    updateMasterDataDto: UpdateMasterDataDto,
  ) {
    const model = this.getModel(type);

    try {
      const result = await model.update({
        where: { id_tenantId: { id, tenantId } },
        data: updateMasterDataDto,
      });

      // Invalidate cache
      await this.cacheManager.del(`master_data_${tenantId}_${type}`);

      return result;
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }

  async remove(tenantId: string, type: string, id: string) {
    const model = this.getModel(type);

    try {
      const result = await model.delete({
        where: { id_tenantId: { id, tenantId } },
      });

      // Invalidate cache
      await this.cacheManager.del(`master_data_${tenantId}_${type}`);

      return result;
    } catch (e: any) {
      if (e.code === 'P2025') throw new NotFoundException();
      throw e;
    }
  }
}
