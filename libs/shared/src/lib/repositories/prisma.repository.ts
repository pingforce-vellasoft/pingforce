import { NotFoundException } from '@nestjs/common';
import { BaseRepository } from './base.repository';

export abstract class PrismaRepository<
  T,
  CreateDto,
  UpdateDto,
  Delegate extends {
    create: (args: any) => Promise<T>;
    findMany: (args: any) => Promise<T[]>;
    findFirst: (args: any) => Promise<T | null>;
    update: (args: any) => Promise<T>;
    delete: (args: any) => Promise<T>;
  }
> implements BaseRepository<T, CreateDto, UpdateDto> {
  constructor(protected readonly delegate: Delegate) {}

  async create(tenantId: string, data: CreateDto): Promise<T> {
    return this.delegate.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, skip?: number, take?: number): Promise<T[]> {
    return this.delegate.findMany({
      where: { tenantId },
      skip,
      take,
    });
  }

  async findById(tenantId: string, id: string): Promise<T | null> {
    const record = await this.delegate.findFirst({
      where: { id, tenantId },
    });
    if (!record) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }
    return record;
  }

  async update(tenantId: string, id: string, data: UpdateDto): Promise<T> {
    try {
      return await this.delegate.update({
        where: { id_tenantId: { id, tenantId } },
        data,
      });
    } catch (e: any) {
      if (e.code === 'P2025') {
        throw new NotFoundException(`Resource with ID ${id} not found`);
      }
      throw e;
    }
  }

  async delete(tenantId: string, id: string): Promise<T> {
    try {
      return await this.delegate.delete({
        where: { id_tenantId: { id, tenantId } },
      });
    } catch (e: any) {
      if (e.code === 'P2025') {
        throw new NotFoundException(`Resource with ID ${id} not found`);
      }
      throw e;
    }
  }
}
