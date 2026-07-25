import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { LeadConvertedEvent } from './events/impl';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { SyncLeadsDto } from './dto/sync-leads.dto';
import { LeadRepository } from './lead.repository';
import { RbacService } from '../rbac/rbac.service';

// Leads are visible to their owner and creator within the caller's data
// scope (DataScope.md §9 "Leads").
const LEAD_SCOPE_FIELDS = ['ownerUserId', 'createdBy'] as const;

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

  async create(tenantId: string, createLeadDto: CreateLeadDto) {
    return await this.leadRepository.create(tenantId, createLeadDto);
  }

  private async leadScopeWhere(
    tenantId: string,
    requesterUserId: string,
  ): Promise<Record<string, unknown> | null> {
    const scope = await this.rbacService.resolveScopeIds(
      tenantId,
      requesterUserId,
      'LEADS',
      ['READ'],
    );
    return this.rbacService.userScopeWhere(scope, LEAD_SCOPE_FIELDS);
  }

  async findAll(
    tenantId: string,
    requesterUserId: string,
    cursor?: string,
    take?: number,
  ) {
    const scopeWhere = await this.leadScopeWhere(tenantId, requesterUserId);
    if (scopeWhere === null) return [];
    return await this.leadRepository.findAll(
      tenantId,
      cursor,
      take,
      scopeWhere,
    );
  }

  async getPipeline(
    tenantId: string,
    requesterUserId: string,
    cursor?: string,
    take?: number,
  ) {
    const scopeWhere = await this.leadScopeWhere(tenantId, requesterUserId);
    if (scopeWhere === null) return [];
    return await this.leadRepository.getPipeline(
      tenantId,
      cursor,
      take,
      scopeWhere,
    );
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
  ) {
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
          result: updatedLead,
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
        result: customer,
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
        const existing = await this.prisma.lead.findFirst({
          where: { tenantId, leadNumber: item.leadNumber },
          select: { id: true },
        });
        if (existing) {
          results.push({
            clientRef,
            status: 'DUPLICATE',
            leadId: existing.id,
          });
          continue;
        }
        const lead = await this.leadRepository.create(
          tenantId,
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

  private generateCustomerCode(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `C-${ts}-${rand}`;
  }
}
