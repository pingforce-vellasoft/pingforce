import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PipelineStage } from '@prisma/client';
import { LeadRepository } from './lead.repository';
import { LeadService } from './lead.service';

/**
 * Tenant pipeline stage management (3.4 SALES_PIPELINE.md §3–§4: tenants may
 * add, rename, reorder and remove stages). Listing still goes through
 * LeadService.listStages so a tenant with no stages gets the defaults first.
 */
@Injectable()
export class PipelineStageService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly leadService: LeadService,
  ) {}

  async create(
    tenantId: string,
    actorUserId: string,
    name: string,
  ): Promise<PipelineStage> {
    const stages = await this.leadService.listStages(tenantId);
    const clean = this.cleanName(name);
    this.assertUniqueName(stages, clean);
    const nextOrder = stages.reduce((max, s) => Math.max(max, s.order), 0) + 1;
    return this.leadRepository.createStage(
      tenantId,
      clean,
      nextOrder,
      actorUserId,
    );
  }

  async rename(
    tenantId: string,
    stageId: string,
    actorUserId: string,
    name: string,
  ): Promise<PipelineStage> {
    const stages = await this.leadRepository.listStages(tenantId);
    if (!stages.some((s) => s.id === stageId)) {
      throw new NotFoundException('Pipeline stage not found');
    }
    const clean = this.cleanName(name);
    this.assertUniqueName(stages, clean, stageId);
    return this.leadRepository.updateStageRow(tenantId, stageId, {
      name: clean,
      updatedBy: actorUserId,
    });
  }

  /** `stageIds` must list exactly the tenant's stages, in the new order. */
  async reorder(
    tenantId: string,
    actorUserId: string,
    stageIds: readonly string[],
  ): Promise<PipelineStage[]> {
    const stages = await this.leadRepository.listStages(tenantId);
    const current = new Set(stages.map((s) => s.id));
    if (
      stageIds.length !== current.size ||
      !stageIds.every((id) => current.has(id))
    ) {
      throw new BadRequestException(
        'stageIds must list every pipeline stage of this tenant exactly once',
      );
    }
    await this.leadRepository.reorderStages(tenantId, stageIds, actorUserId);
    return this.leadRepository.listStages(tenantId);
  }

  /**
   * Soft-deletes an empty stage. A stage that still holds leads cannot be
   * removed — move them first — so no lead silently loses its stage.
   */
  async remove(tenantId: string, stageId: string): Promise<PipelineStage> {
    const stages = await this.leadRepository.listStages(tenantId);
    if (!stages.some((s) => s.id === stageId)) {
      throw new NotFoundException('Pipeline stage not found');
    }
    if (stages.length === 1) {
      throw new BadRequestException('A pipeline needs at least one stage');
    }
    const leads = await this.leadRepository.countLeadsInStage(
      tenantId,
      stageId,
    );
    if (leads > 0) {
      throw new ConflictException(
        `${leads} lead(s) are in this stage. Move them to another stage first.`,
      );
    }
    return this.leadRepository.deleteStage(tenantId, stageId);
  }

  private cleanName(name: string): string {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) throw new BadRequestException('Stage name is required');
    return clean;
  }

  private assertUniqueName(
    stages: readonly PipelineStage[],
    name: string,
    exceptId?: string,
  ): void {
    const lower = name.toLowerCase();
    if (
      stages.some((s) => s.id !== exceptId && s.name.toLowerCase() === lower)
    ) {
      throw new ConflictException(`A stage named "${name}" already exists`);
    }
  }
}
