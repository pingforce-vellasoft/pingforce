import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PipelineStageService } from './pipeline-stage.service';
import { LeadRepository } from './lead.repository';
import { LeadService } from './lead.service';

const TENANT = 'tenant-1';
const USER = 'user-1';

const stage = (id: string, name: string, order: number) => ({
  id,
  name,
  order,
  tenantId: TENANT,
});

describe('PipelineStageService', () => {
  let repo: {
    listStages: jest.Mock;
    createStage: jest.Mock;
    updateStageRow: jest.Mock;
    reorderStages: jest.Mock;
    countLeadsInStage: jest.Mock;
    deleteStage: jest.Mock;
  };
  let leadService: { listStages: jest.Mock };
  let service: PipelineStageService;
  const STAGES = [stage('s1', 'New', 1), stage('s2', 'Won', 2)];

  beforeEach(() => {
    repo = {
      listStages: jest.fn().mockResolvedValue(STAGES),
      createStage: jest.fn(async (_t, name, order) => stage('s3', name, order)),
      updateStageRow: jest.fn(async (_t, id, data) => ({ id, ...data })),
      reorderStages: jest.fn().mockResolvedValue(undefined),
      countLeadsInStage: jest.fn().mockResolvedValue(0),
      deleteStage: jest.fn(async (_t, id) => ({ id })),
    };
    leadService = { listStages: jest.fn().mockResolvedValue(STAGES) };
    service = new PipelineStageService(
      repo as unknown as LeadRepository,
      leadService as unknown as LeadService,
    );
  });

  describe('create', () => {
    it('appends a trimmed stage after the last one', async () => {
      await service.create(TENANT, USER, '  Site   Survey ');
      // Goes through LeadService so a tenant without stages gets defaults first.
      expect(leadService.listStages).toHaveBeenCalledWith(TENANT);
      expect(repo.createStage).toHaveBeenCalledWith(
        TENANT,
        'Site Survey',
        3,
        USER,
      );
    });

    it('rejects a duplicate name, ignoring case', async () => {
      await expect(service.create(TENANT, USER, 'won')).rejects.toThrow(
        ConflictException,
      );
      expect(repo.createStage).not.toHaveBeenCalled();
    });

    it('rejects a blank name', async () => {
      await expect(service.create(TENANT, USER, '   ')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rename', () => {
    it('renames a stage of this tenant', async () => {
      await service.rename(TENANT, 's1', USER, 'Fresh');
      expect(repo.updateStageRow).toHaveBeenCalledWith(TENANT, 's1', {
        name: 'Fresh',
        updatedBy: USER,
      });
    });

    it('allows keeping the same name with different case', async () => {
      await service.rename(TENANT, 's1', USER, 'NEW');
      expect(repo.updateStageRow).toHaveBeenCalled();
    });

    it('rejects a name another stage already uses', async () => {
      await expect(service.rename(TENANT, 's1', USER, 'Won')).rejects.toThrow(
        ConflictException,
      );
    });

    it('returns 404 for a stage outside the tenant', async () => {
      await expect(
        service.rename(TENANT, 'foreign', USER, 'X'),
      ).rejects.toThrow(NotFoundException);
      expect(repo.updateStageRow).not.toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    it('writes the new order for exactly the tenant stages', async () => {
      await service.reorder(TENANT, USER, ['s2', 's1']);
      expect(repo.reorderStages).toHaveBeenCalledWith(
        TENANT,
        ['s2', 's1'],
        USER,
      );
    });

    it.each([[['s1']], [['s1', 's2', 's3']], [['s1', 'foreign']]])(
      'rejects %j (missing, extra or foreign ids)',
      async (ids) => {
        await expect(service.reorder(TENANT, USER, ids)).rejects.toThrow(
          BadRequestException,
        );
        expect(repo.reorderStages).not.toHaveBeenCalled();
      },
    );
  });

  describe('remove', () => {
    it('soft-deletes an empty stage', async () => {
      await service.remove(TENANT, 's2');
      expect(repo.countLeadsInStage).toHaveBeenCalledWith(TENANT, 's2');
      expect(repo.deleteStage).toHaveBeenCalledWith(TENANT, 's2');
    });

    it('refuses while leads are in the stage', async () => {
      repo.countLeadsInStage.mockResolvedValue(4);
      await expect(service.remove(TENANT, 's2')).rejects.toThrow(
        '4 lead(s) are in this stage',
      );
      expect(repo.deleteStage).not.toHaveBeenCalled();
    });

    it('keeps at least one stage', async () => {
      repo.listStages.mockResolvedValue([stage('s1', 'New', 1)]);
      await expect(service.remove(TENANT, 's1')).rejects.toThrow(
        'at least one stage',
      );
    });

    it('returns 404 for a stage outside the tenant', async () => {
      await expect(service.remove(TENANT, 'foreign')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
