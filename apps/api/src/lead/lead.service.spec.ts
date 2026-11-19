import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import {
  DEFAULT_PIPELINE_STAGES,
  LeadService,
  defaultStageId,
} from './lead.service';
import { LeadRepository } from './lead.repository';
import { RbacService } from '../rbac/rbac.service';
import { LeadConvertedEvent } from './events/impl';
import { CreateLeadDto } from './dto/create-lead.dto';
import { SyncLeadsDto } from './dto/sync-leads.dto';

const TENANT = 'tenant-1';
const USER = 'user-1';
const LEAD = 'lead-1';
const OWN_SCOPE = {
  OR: [{ ownerUserId: { in: [USER] } }, { createdBy: { in: [USER] } }],
};

describe('LeadService', () => {
  let repo: {
    createLead: jest.Mock;
    findAll: jest.Mock;
    getPipeline: jest.Mock;
    findVisible: jest.Mock;
    updateLead: jest.Mock;
    delete: jest.Mock;
    findByLeadNumber: jest.Mock;
    referenceExists: jest.Mock;
    listStages: jest.Mock;
    createStages: jest.Mock;
  };
  let tx: {
    lead: { findFirst: jest.Mock; update: jest.Mock };
    customer: { findFirst: jest.Mock; create: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };
  let eventBus: { publish: jest.Mock };
  let rbac: { resolveScopeIds: jest.Mock; userScopeWhere: jest.Mock };
  let service: LeadService;

  const dto = (overrides: Partial<CreateLeadDto> = {}): CreateLeadDto =>
    ({ leadNumber: 'L-1', firstName: 'Asha', ...overrides }) as CreateLeadDto;

  beforeEach(() => {
    repo = {
      createLead: jest.fn(async (_t: string, data: CreateLeadDto) => ({
        id: LEAD,
        ...data,
      })),
      findAll: jest.fn().mockResolvedValue([]),
      getPipeline: jest.fn().mockResolvedValue([]),
      findVisible: jest.fn().mockResolvedValue({ id: LEAD }),
      updateLead: jest.fn(async (_t: string, id: string, data: object) => ({
        id,
        ...data,
      })),
      delete: jest.fn().mockResolvedValue({ id: LEAD }),
      findByLeadNumber: jest.fn().mockResolvedValue(null),
      referenceExists: jest.fn().mockResolvedValue(true),
      listStages: jest.fn().mockResolvedValue([]),
      createStages: jest.fn().mockResolvedValue(undefined),
    };
    tx = {
      lead: {
        findFirst: jest.fn().mockResolvedValue({
          id: LEAD,
          leadNumber: 'L-1',
          firstName: 'Asha',
          lastName: 'K',
          companyName: null,
          email: 'asha@example.com',
          mobile: null,
          ownerUserId: USER,
          convertedCustomerId: null,
        }),
        update: jest.fn().mockResolvedValue({ id: LEAD }),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'cust-1' }),
      },
    };
    prisma = { $transaction: jest.fn((fn) => fn(tx)) };
    eventBus = { publish: jest.fn() };
    rbac = {
      resolveScopeIds: jest
        .fn()
        .mockResolvedValue({ kind: 'IDS', userIds: [USER] }),
      userScopeWhere: jest.fn().mockReturnValue(OWN_SCOPE),
    };
    service = new LeadService(
      repo as unknown as LeadRepository,
      prisma as never,
      eventBus as unknown as EventBus,
      rbac as unknown as RbacService,
    );
  });

  describe('create', () => {
    it('stamps the creator so a READ_OWN creator can see the lead', async () => {
      await service.create(TENANT, USER, dto());
      expect(repo.createLead).toHaveBeenCalledWith(TENANT, dto(), USER);
    });

    it('checks every reference against the tenant', async () => {
      await service.create(
        TENANT,
        USER,
        dto({
          pipelineStageId: 's',
          statusId: 'st',
          sourceId: 'so',
          campaignId: 'c',
          priorityId: 'p',
          ownerUserId: 'o',
        }),
      );
      expect(repo.referenceExists.mock.calls).toEqual([
        ['pipelineStageId', TENANT, 's'],
        ['statusId', TENANT, 'st'],
        ['sourceId', TENANT, 'so'],
        ['campaignId', TENANT, 'c'],
        ['priorityId', TENANT, 'p'],
        ['ownerUserId', TENANT, 'o'],
      ]);
    });

    it('rejects a reference from another tenant without creating', async () => {
      repo.referenceExists.mockImplementation(
        async (kind: string) => kind !== 'pipelineStageId',
      );
      await expect(
        service.create(TENANT, USER, dto({ pipelineStageId: 'foreign' })),
      ).rejects.toThrow('Invalid pipelineStageId for this tenant');
      expect(repo.createLead).not.toHaveBeenCalled();
    });
  });

  describe('reads', () => {
    it('returns an empty list when the caller has no LEADS scope', async () => {
      rbac.userScopeWhere.mockReturnValue(null);
      await expect(service.findAll(TENANT, USER)).resolves.toEqual([]);
      await expect(service.getPipeline(TENANT, USER)).resolves.toEqual([]);
      expect(repo.findAll).not.toHaveBeenCalled();
      expect(repo.getPipeline).not.toHaveBeenCalled();
    });

    it('scopes list and pipeline queries', async () => {
      await service.findAll(TENANT, USER, 'cur', 10);
      await service.getPipeline(TENANT, USER, undefined, 20);
      expect(repo.findAll).toHaveBeenCalledWith(TENANT, 'cur', 10, OWN_SCOPE);
      expect(repo.getPipeline).toHaveBeenCalledWith(
        TENANT,
        undefined,
        20,
        OWN_SCOPE,
      );
    });

    it('scopes the detail read to the caller', async () => {
      await service.findOne(TENANT, LEAD, USER);
      expect(rbac.resolveScopeIds).toHaveBeenCalledWith(TENANT, USER, 'LEADS', [
        'READ',
      ]);
      expect(repo.findVisible).toHaveBeenCalledWith(TENANT, LEAD, OWN_SCOPE);
    });

    it('returns 404 for a lead outside the caller scope', async () => {
      repo.findVisible.mockResolvedValue(null);
      await expect(service.findOne(TENANT, LEAD, USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns 404 without querying when the caller has no scope', async () => {
      rbac.userScopeWhere.mockReturnValue(null);
      await expect(service.findOne(TENANT, LEAD, USER)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.findVisible).not.toHaveBeenCalled();
    });
  });

  describe('mutations', () => {
    it('updates with the UPDATE scope and records updatedBy', async () => {
      await service.update(TENANT, LEAD, USER, { firstName: 'B' });
      expect(rbac.resolveScopeIds).toHaveBeenCalledWith(TENANT, USER, 'LEADS', [
        'UPDATE',
      ]);
      expect(repo.updateLead).toHaveBeenCalledWith(TENANT, LEAD, {
        firstName: 'B',
        updatedBy: USER,
      });
    });

    it('404s an out-of-scope lead before checking references', async () => {
      repo.findVisible.mockResolvedValue(null);
      await expect(
        service.update(TENANT, LEAD, USER, { statusId: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(repo.referenceExists).not.toHaveBeenCalled();
      expect(repo.updateLead).not.toHaveBeenCalled();
    });

    it('rejects assigning an owner from another tenant', async () => {
      repo.referenceExists.mockResolvedValue(false);
      await expect(
        service.assignOwner(TENANT, LEAD, USER, 'foreign-user'),
      ).rejects.toThrow('Invalid ownerUserId for this tenant');
      expect(repo.updateLead).not.toHaveBeenCalled();
    });

    it('moves a lead to a stage in the same tenant', async () => {
      await service.updateStage(TENANT, LEAD, USER, 'stage-2');
      expect(repo.referenceExists).toHaveBeenCalledWith(
        'pipelineStageId',
        TENANT,
        'stage-2',
      );
      expect(repo.updateLead).toHaveBeenCalledWith(TENANT, LEAD, {
        pipelineStageId: 'stage-2',
        updatedBy: USER,
      });
    });

    it('rejects a stage from another tenant', async () => {
      repo.referenceExists.mockResolvedValue(false);
      await expect(
        service.updateStage(TENANT, LEAD, USER, 'foreign-stage'),
      ).rejects.toThrow(BadRequestException);
      expect(repo.updateLead).not.toHaveBeenCalled();
    });

    it('cannot move a lead outside the caller scope', async () => {
      repo.findVisible.mockResolvedValue(null);
      await expect(
        service.updateStage(TENANT, LEAD, USER, 'stage-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes with the DELETE scope', async () => {
      await service.remove(TENANT, LEAD, USER);
      expect(rbac.resolveScopeIds).toHaveBeenCalledWith(TENANT, USER, 'LEADS', [
        'DELETE',
      ]);
      expect(repo.delete).toHaveBeenCalledWith(TENANT, LEAD);
    });

    it('cannot delete a lead outside the caller scope', async () => {
      repo.findVisible.mockResolvedValue(null);
      await expect(service.remove(TENANT, LEAD, USER)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('convert', () => {
    it('404s a lead outside the CONVERT scope without opening a transaction', async () => {
      repo.findVisible.mockResolvedValue(null);
      await expect(service.convert(TENANT, LEAD, USER, {})).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(rbac.resolveScopeIds).toHaveBeenCalledWith(TENANT, USER, 'LEADS', [
        'CONVERT',
      ]);
    });

    it('creates a customer, links the lead and publishes LEAD.CONVERTED', async () => {
      const result = await service.convert(TENANT, LEAD, USER, {});
      expect(result).toEqual({ id: 'cust-1' });
      expect(tx.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT,
          legalName: 'Asha K',
          primaryEmail: 'asha@example.com',
          accountManagerId: USER,
          createdBy: USER,
        }),
      });
      expect(tx.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ convertedCustomerId: 'cust-1' }),
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(LeadConvertedEvent),
      );
    });

    it('blocks conversion when a customer already has the same contact details', async () => {
      tx.customer.findFirst.mockResolvedValue({
        id: 'c-9',
        customerCode: 'C-9',
        legalName: 'Asha Ltd',
      });
      await expect(service.convert(TENANT, LEAD, USER, {})).rejects.toThrow(
        ConflictException,
      );
      expect(tx.customer.create).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('merges into an existing customer of the same tenant', async () => {
      tx.customer.findFirst.mockResolvedValue({ id: 'c-9' });
      await service.convert(TENANT, LEAD, USER, { mergeWithCustomerId: 'c-9' });
      expect(tx.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c-9', tenantId: TENANT, deletedAt: null },
        }),
      );
      expect(tx.customer.create).not.toHaveBeenCalled();
    });

    it('rejects re-converting a converted lead', async () => {
      tx.lead.findFirst.mockResolvedValue({
        id: LEAD,
        convertedCustomerId: 'cust-1',
      });
      await expect(service.convert(TENANT, LEAD, USER, {})).rejects.toThrow(
        'already converted',
      );
    });
  });

  describe('syncLeads', () => {
    const item = (n: string, timestamp: string, extra: object = {}) => ({
      clientRef: `ref-${n}`,
      timestamp,
      leadNumber: `L-${n}`,
      firstName: 'X',
      ...extra,
    });

    it('applies in capture order, skips duplicates and stamps the creator', async () => {
      repo.findByLeadNumber.mockImplementation(
        async (_t: string, leadNumber: string) =>
          leadNumber === 'L-2' ? { id: 'existing' } : null,
      );
      const { results } = await service.syncLeads(TENANT, USER, {
        leads: [
          item('1', '2026-11-19T10:00:00Z'),
          item('2', '2026-11-19T09:00:00Z'),
        ],
      } as SyncLeadsDto);

      expect(results).toEqual([
        { clientRef: 'ref-2', status: 'DUPLICATE', leadId: 'existing' },
        { clientRef: 'ref-1', status: 'APPLIED', leadId: LEAD },
      ]);
      expect(repo.createLead).toHaveBeenCalledWith(
        TENANT,
        expect.not.objectContaining({ clientRef: expect.anything() }),
        USER,
      );
    });

    it('fails one item with a foreign reference and keeps going', async () => {
      repo.referenceExists.mockImplementation(
        async (_k: string, _t: string, id: string) => id !== 'foreign',
      );
      const { results } = await service.syncLeads(TENANT, USER, {
        leads: [
          item('1', '2026-11-19T09:00:00Z', { pipelineStageId: 'foreign' }),
          item('2', '2026-11-19T10:00:00Z'),
        ],
      } as SyncLeadsDto);

      expect(results[0]).toMatchObject({
        clientRef: 'ref-1',
        status: 'FAILED',
      });
      expect(results[1]).toMatchObject({
        clientRef: 'ref-2',
        status: 'APPLIED',
      });
    });
  });

  describe('pipeline stages', () => {
    it('returns existing stages without seeding', async () => {
      repo.listStages.mockResolvedValue([{ id: 's1', name: 'Custom' }]);
      await expect(service.listStages(TENANT)).resolves.toEqual([
        { id: 's1', name: 'Custom' },
      ]);
      expect(repo.createStages).not.toHaveBeenCalled();
    });

    it('seeds the nine spec defaults, in order, for a tenant with none', async () => {
      repo.listStages
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'seeded' }]);
      await expect(service.listStages(TENANT)).resolves.toEqual([
        { id: 'seeded' },
      ]);
      const rows = repo.createStages.mock.calls[0][0];
      expect(rows.map((r: { name: string }) => r.name)).toEqual([
        ...DEFAULT_PIPELINE_STAGES,
      ]);
      expect(rows[0]).toEqual({
        id: defaultStageId(TENANT, 'New'),
        tenantId: TENANT,
        name: 'New',
        order: 1,
      });
    });

    it('derives stable, UUID-shaped ids per tenant and name', () => {
      const id = defaultStageId(TENANT, 'Won');
      expect(id).toBe(defaultStageId(TENANT, 'Won'));
      expect(id).not.toBe(defaultStageId('tenant-2', 'Won'));
      expect(id).not.toBe(defaultStageId(TENANT, 'Lost'));
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });
  });
});
