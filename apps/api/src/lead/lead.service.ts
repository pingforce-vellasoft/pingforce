import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { LeadRepository } from './lead.repository';

@Injectable()
export class LeadService {
  constructor(
    private readonly leadRepository: LeadRepository,
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
  ) {}

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
    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({ where: { id, tenantId } });
      if (!lead) throw new NotFoundException(`Lead ${id} not found`);
      if (lead.convertedCustomerId) {
        throw new ConflictException(
          `Lead already converted to customer ${lead.convertedCustomerId}`,
        );
      }

      // Duplicate resolution: merge into an existing customer (§7)
      if (dto.mergeWithCustomerId) {
        const existing = await tx.customer.findFirst({
          where: { id: dto.mergeWithCustomerId, tenantId },
          select: { id: true },
        });
        if (!existing) {
          throw new BadRequestException('mergeWithCustomerId not found');
        }
        return tx.lead.update({
          where: { id_tenantId: { id, tenantId } },
          data: {
            convertedCustomerId: existing.id,
            convertedAt: new Date(),
            updatedBy: actorUserId,
          },
        });
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

      return customer;
    });
  }

  private generateCustomerCode(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `C-${ts}-${rand}`;
  }
}
