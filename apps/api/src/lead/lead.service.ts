import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadRepository } from './lead.repository';

@Injectable()
export class LeadService {
  constructor(private readonly leadRepository: LeadRepository) {}

  async create(tenantId: string, createLeadDto: CreateLeadDto) {
    return await this.leadRepository.create(tenantId, createLeadDto);
  }

  async findAll(tenantId: string, cursor?: string, take?: number) {
    return await this.leadRepository.findAll(tenantId, cursor, take);
  }

  async getPipeline(tenantId: string, cursor?: string, take?: number) {
    return await this.leadRepository.getPipeline(tenantId, cursor, take);
  }

  async findOne(tenantId: string, id: string) {
    return await this.leadRepository.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, updateLeadDto: UpdateLeadDto) {
    return await this.leadRepository.update(tenantId, id, updateLeadDto);
  }

  async assignOwner(tenantId: string, id: string, ownerUserId: string) {
    return await this.leadRepository.assignOwner(tenantId, id, ownerUserId);
  }

  async updateStage(tenantId: string, id: string, pipelineStageId: string) {
    return await this.leadRepository.updateStage(tenantId, id, pipelineStageId);
  }

  async remove(tenantId: string, id: string) {
    return await this.leadRepository.delete(tenantId, id);
  }
}
