import { ForbiddenException } from '@nestjs/common';
import { FaultAccessService } from './fault-access.service';

type ServiceArgs = ConstructorParameters<typeof FaultAccessService>;

function makeService() {
  const rbac = {
    resolveScopeIds: jest.fn().mockResolvedValue({ kind: 'ALL' }),
    userScopeWhere: jest.fn().mockReturnValue({}),
  };
  return {
    service: new FaultAccessService(rbac as unknown as ServiceArgs[0]),
    rbac,
  };
}

describe('FaultAccessService', () => {
  it('denies a write when its action has no scope grant', async () => {
    const { service, rbac } = makeService();
    rbac.userScopeWhere.mockReturnValue(null);
    await expect(
      service.scopeForAction('tenant-1', 'tech-1', 'UPDATE'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns own/team restrictions for repository mutations', async () => {
    const { service, rbac } = makeService();
    const where = {
      OR: [
        { assignedToId: { in: ['tech-1'] } },
        { createdBy: { in: ['tech-1'] } },
      ],
    };
    rbac.userScopeWhere.mockReturnValue(where);
    await expect(
      service.scopeForAction('tenant-1', 'tech-1', 'UPDATE'),
    ).resolves.toEqual(where);
    expect(rbac.resolveScopeIds).toHaveBeenCalledWith(
      'tenant-1',
      'tech-1',
      'FAULTS',
      ['UPDATE'],
    );
  });

  it('permits self-assignment during field creation without a dispatcher grant', async () => {
    const { service, rbac } = makeService();
    await service.assertAssignmentAllowed('tenant-1', 'tech-1', 'tech-1');
    expect(rbac.resolveScopeIds).not.toHaveBeenCalled();
  });

  it('denies assigning a technician outside the dispatcher scope', async () => {
    const { service, rbac } = makeService();
    rbac.resolveScopeIds.mockResolvedValue({
      kind: 'IDS',
      userIds: ['tech-1'],
      employeeIds: [],
    });
    await expect(
      service.assertAssignmentAllowed('tenant-1', 'dispatcher-1', 'tech-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
