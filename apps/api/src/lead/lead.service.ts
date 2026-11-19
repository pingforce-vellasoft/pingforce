import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { createHash } from 'crypto';
import { Customer, Lead, PipelineStage } from '@prisma/client';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { LeadConvertedEvent } from './events/impl';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { SyncLeadsDto } from './dto/sync-leads.dto';
import { LeadReferenceKind, LeadRepository } from './lead.repository';
import { RbacService } from '../rbac/rbac.service';

// Leads are visible to their owner and creator within the caller's data
// scope (DataScope.md §9 "Leads").
const LEAD_SCOPE_FIELDS = ['ownerUserId', 'createdBy'] as const;

const REFERENCE_FIELDS: readonly LeadReferenceKind[] = [
  'pipelineStageId',
  'statusId',
  'sourceId',
  'campaignId',
  'priorityId',
  'ownerUserId',
];

type LeadAction = 'READ' | 'UPDATE' | 'DELETE' | 'CONVERT';

/** 3.4 LeadManagement README "Lead Pipeline" default stages, in order. */
export const DEFAULT_PIPELINE_STAGES = [
  'New',
  'Assigned',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
  'Archived',
] as const;

/**
 * Stable UUID-shaped id for a tenant's default stage, so two concurrent
 * first loads insert the same rows and `skipDuplicates` drops the second.
 */
export function defaultStageId(tenantId: string, name: string): string {
  const h = createHash('sha256')
    .update(`pipeline-stage:${tenantId}:${name}`)
    .digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export interface LeadSyncItemResult {
  readonly clientRef: string;
  readonly status: 'APPLIED' | 'DUPLICATE' | 'FAILED';
  readonly leadId?: string;
  readonly error?: string;
}

@Injectable()
export class LeadService {
  constructor(
    private readonly leadRepository: LeadRepository,
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly eventBus: EventBus,
    private readonly rbacService: RbacService,
  ) {}

  async create(
    tenantId: string,
    actorUserId: string,
    createLeadDto: CreateLeadDto,
  ): Promise<Lead> {
    await this.assertReferences(tenantId, createLeadDto);
    // createdBy is one of the two scope fields: without it a READ_OWN user
    // could not see a lead they just created without owning it.
    return this.leadRepository.createLead(tenantId, createLeadDto, actorUserId);
  }

  private async leadScopeWhere(
    tenantId: string,
    requesterUserId: string,
    action: LeadAction = 'READ',
  ): Promise<Record<string, unknown> | null> {
    const scope = await this.rbacService.resolveScopeIds(
      tenantId,
      requesterUserId,
      'LEADS',
      [action],
    );
    return this.rbacService.userScopeWhere(scope, LEAD_SCOPE_FIELDS);
  }

  /**
   * One lead the caller may act on. Out of tenant, out of scope and missing
   * all answer 404, so an id never reveals whether a lead exists elsewhere.
   */
  private async findVisibleOr404(
    tenantId: string,
    id: string,
    requesterUserId: string,
    action: LeadAction,
  ): Promise<Lead> {
    const scopeWhere = await this.leadScopeWhere(
      tenantId,
      requesterUserId,
      action,
    );
    const lead =
      scopeWhere === null
        ? null
        : await this.leadRepository.findVisible(tenantId, id, scopeWhere);
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return lead;
  }

  async findAll(
    tenantId: string,
    requesterUserId: string,
    cursor?: string,
    take?: number,
  ): Promise<Lead[]> {
    const scopeWhere = await this.leadScopeWhere(tenantId, requesterUserId);
    if (scopeWhere === null) return [];
    return this.leadRepository.findAll(tenantId, cursor, take, scopeWhere);
  }

  async getPipeline(
    tenantId: string,
    requesterUserId: string,
    cursor?: string,
    take?: number,
  ): Promise<Lead[]> {
    const scopeWhere = await this.leadScopeWhere(tenantId, requesterUserId);
    if (scopeWhere === null) return [];
    return this.leadRepository.getPipeline(tenantId, cursor, take, scopeWhere);
  }

  /**
   * The tenant's pipeline stages for the board. A tenant that has never had
   * stages gets the spec defaults on first read; stage editing is not built
   * yet, so this is the only way stages come into existence.
   */
  async listStages(tenantId: string): Promise<PipelineStage[]> {
    const stages = await this.leadRepository.listStages(tenantId);
    if (stages.length > 0) return stages;
    await this.leadRepository.createStages(
      DEFAULT_PIPELINE_STAGES.map((name, index) => ({
        id: defaultStageId(tenantId, name),
        tenantId,
        name,
        order: index + 1,
      })),
    );
    return this.leadRepository.listStages(tenantId);
  }

  async findOne(
    tenantId: string,
    id: string,
    requesterUserId: string,
  ): Promise<Lead> {
    return this.findVisibleOr404(tenantId, id, requesterUserId, 'READ');
  }

  async update(
    tenantId: string,
    id: string,
    actorUserId: string,
    updateLeadDto: UpdateLeadDto,
  ): Promise<Lead> {
    await this.findVisibleOr404(tenantId, id, actorUserId, 'UPDATE');
    await this.assertReferences(tenantId, updateLeadDto);
    return this.leadRepository.updateLead(tenantId, id, {
      ...updateLeadDto,
      updatedBy: actorUserId,
    });
  }

  async assignOwner(
    tenantId: string,
    id: string,
    actorUserId: string,
    ownerUserId: string,
  ): Promise<Lead> {
    await this.findVisibleOr404(tenantId, id, actorUserId, 'UPDATE');
    await this.assertReferences(tenantId, { ownerUserId });
    return this.leadRepository.updateLead(tenantId, id, {
      ownerUserId,
      updatedBy: actorUserId,
    });
  }

  async updateStage(
    tenantId: string,
    id: string,
    actorUserId: string,
    pipelineStageId: string,
  ): Promise<Lead> {
    await this.findVisibleOr404(tenantId, id, actorUserId, 'UPDATE');
    await this.assertReferences(tenantId, { pipelineStageId });
    return this.leadRepository.updateLead(tenantId, id, {
      pipelineStageId,
      updatedBy: actorUserId,
    });
  }

  /** Soft delete: the Prisma extension turns delete into deletedAt = now(). */
  async remove(
    tenantId: string,
    id: string,
    actorUserId: string,
  ): Promise<Lead> {
    await this.findVisibleOr404(tenantId, id, actorUserId, 'DELETE');
    return this.leadRepository.delete(tenantId, id);
  }

  /**
   * Lead → customer conversion (3.4 CUSTOMER_CONVERSION.md).
   *
   * Duplicate email/mobile detection blocks the conversion (§6-§7) unless
   * the caller resolves it by passing `mergeWithCustomerId`, which links the
   * lead to the existing customer instead of creating a new record. Runs in
   * a transaction; the lead keeps full traceability via convertedCustomerId
   * + convertedAt, and re-converting a converted lead is rejected.
   */
  async convert(
    tenantId: string,
    id: string,
    actorUserId: string,
    dto: ConvertLeadDto,
  ): Promise<Lead | Customer> {
    // Scope check outside the transaction: same 404 as any other lead action.
    await this.findVisibleOr404(tenantId, id, actorUserId, 'CONVERT');

    const { result, converted } = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: { id, tenantId, deletedAt: null },
      });
      if (!lead) throw new NotFoundException(`Lead ${id} not found`);
      if (lead.convertedCustomerId) {
        throw new ConflictException(
          `Lead already converted to customer ${lead.convertedCustomerId}`,
        );
      }

      // Duplicate resolution: merge into an existing customer (§7)
      if (dto.mergeWithCustomerId) {
        const existing = await tx.customer.findFirst({
          where: { id: dto.mergeWithCustomerId, tenantId, deletedAt: null },
          select: { id: true },
        });
        if (!existing) {
          throw new BadRequestException('mergeWithCustomerId not found');
        }
        const updatedLead = await tx.lead.update({
          where: { id_tenantId: { id, tenantId } },
          data: {
            convertedCustomerId: existing.id,
            convertedAt: new Date(),
            updatedBy: actorUserId,
          },
        });
        return {
          result: updatedLead as Lead | Customer,
          converted: {
            leadNumber: lead.leadNumber,
            customerId: existing.id,
            ownerUserId: lead.ownerUserId,
          },
        };
      }

      // Duplicate detection on contact identifiers (§6)
      if (lead.email || lead.mobile) {
        const duplicate = await tx.customer.findFirst({
          where: {
            tenantId,
            OR: [
              ...(lead.email ? [{ primaryEmail: lead.email }] : []),
              ...(lead.mobile ? [{ primaryMobile: lead.mobile }] : []),
            ],
          },
          select: { id: true, customerCode: true, legalName: true },
        });
        if (duplicate) {
          throw new ConflictException(
            `Duplicate customer ${duplicate.customerCode} (${duplicate.legalName}) matches this lead's contact details; ` +
              'pass mergeWithCustomerId to link the lead to it',
          );
        }
      }

      const legalName =
        dto.legalName ??
        lead.companyName ??
        [lead.firstName, lead.lastName].filter(Boolean).join(' ');

      const customer = await tx.customer.create({
        data: {
          tenantId,
          customerCode: this.generateCustomerCode(),
          legalName,
          displayName: dto.displayName ?? legalName,
          customerType: dto.customerType,
          primaryEmail: lead.email,
          primaryMobile: lead.mobile,
          notes: dto.notes,
          accountManagerId: lead.ownerUserId,
          createdBy: actorUserId,
        },
      });

      await tx.lead.update({
        where: { id_tenantId: { id, tenantId } },
        data: {
          convertedCustomerId: customer.id,
          convertedAt: new Date(),
          updatedBy: actorUserId,
        },
      });

      return {
        result: customer as Lead | Customer,
        converted: {
          leadNumber: lead.leadNumber,
          customerId: customer.id,
          ownerUserId: lead.ownerUserId,
        },
      };
    });

    // LEAD.CONVERTED (3.6 EVENT_CATALOG.md §8) after commit
    this.eventBus.publish(
      new LeadConvertedEvent(
        tenantId,
        id,
        converted.leadNumber,
        converted.customerId,
        converted.ownerUserId,
      ),
    );

    return result;
  }

  /**
   * Offline-captured lead ingestion (3.4 LEAD_CAPTURE.md; mirrors the
   * attendance/visits/faults sync pattern). Items apply in capture order;
   * the client-generated leadNumber (unique per tenant) makes replays
   * report DUPLICATE instead of double-creating.
   */
  async syncLeads(
    tenantId: string,
    actorUserId: string,
    dto: SyncLeadsDto,
  ): Promise<{ results: LeadSyncItemResult[] }> {
    const ordered = [...dto.leads].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );

    const results: LeadSyncItemResult[] = [];
    for (const item of ordered) {
      const { clientRef, timestamp, ...createDto } = item;
      void timestamp;
      try {
        const existing = await this.leadRepository.findByLeadNumber(
          tenantId,
          item.leadNumber,
        );
        if (existing) {
          results.push({
            clientRef,
            status: 'DUPLICATE',
            leadId: existing.id,
          });
          continue;
        }
        const lead = await this.create(
          tenantId,
          actorUserId,
          createDto as CreateLeadDto,
        );
        results.push({ clientRef, status: 'APPLIED', leadId: lead.id });
      } catch (error) {
        results.push({
          clientRef,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Sync failed',
        });
      }
    }

    return { results };
  }

  /**
   * Every stage, status, source, campaign, priority and owner a lead points
   * at must belong to the caller's tenant. Without this a lead could be
   * linked to another tenant's rows, and the detail includes would return
   * them (for an owner: their email and phone).
   */
  private async assertReferences(
    tenantId: string,
    refs: Partial<Record<LeadReferenceKind, string | undefined>>,
  ): Promise<void> {
    for (const field of REFERENCE_FIELDS) {
      const id = refs[field];
      if (!id) continue;
      if (!(await this.leadRepository.referenceExists(field, tenantId, id))) {
        throw new BadRequestException(`Invalid ${field} for this tenant`);
      }
    }
  }

  private generateCustomerCode(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `C-${ts}-${rand}`;
  }
}
