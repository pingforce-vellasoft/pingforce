import { RbacService } from './rbac.service';

/**
 * RBAC permission + data-scope resolution (RBAC.md, DataScope.md).
 * Prisma and the cache are mocked — these tests pin the authorization
 * decisions, the most security-critical logic in the API.
 */

type MockFn = jest.Mock;

interface PrismaMock {
  user: { findUnique: MockFn };
  employee: { findFirst: MockFn; findMany: MockFn };
  userScopeOverride?: { findMany: MockFn };
}

const noCache = {
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
};

function makeService(prisma: PrismaMock): RbacService {
  return new RbacService(
    prisma as unknown as ConstructorParameters<typeof RbacService>[0],
    noCache as unknown as ConstructorParameters<typeof RbacService>[1],
  );
}

function grantsUser(
  roleCode: string,
  grants: { module: string; action: string; dataScope: string }[],
) {
  return {
    role: {
      code: roleCode,
      permissions: grants.map((g) => ({
        dataScope: g.dataScope,
        permission: { module: g.module, action: g.action },
      })),
    },
  };
}

describe('RbacService.hasPermission', () => {
  it('grants when the role holds the module:action pair', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('MANAGER', [
              { module: 'LEAVES', action: 'APPROVE', dataScope: 'TEAM' },
            ]),
          ),
      },
      employee: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    const service = makeService(prisma);
    await expect(
      service.hasPermission('u1', 'LEAVES', 'APPROVE'),
    ).resolves.toBe(true);
    await expect(service.hasPermission('u1', 'LEAVES', 'DELETE')).resolves.toBe(
      false,
    );
  });

  it('denies users without a role', async () => {
    const prisma: PrismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: null }) },
      employee: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    const service = makeService(prisma);
    await expect(service.hasPermission('u1', 'LEAVES', 'READ')).resolves.toBe(
      false,
    );
  });

  it('bypasses checks for SUPER_ADMIN', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(grantsUser('SUPER_ADMIN', [])),
      },
      employee: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    const service = makeService(prisma);
    await expect(
      service.hasPermission('u1', 'ANYTHING', 'DELETE'),
    ).resolves.toBe(true);
  });
});

describe('RbacService.getDataScope', () => {
  it('returns the granted scope, ALL for super admin and null when missing', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('MANAGER', [
              { module: 'FAULTS', action: 'READ', dataScope: 'TEAM' },
            ]),
          ),
      },
      employee: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    const service = makeService(prisma);
    await expect(service.getDataScope('u1', 'FAULTS', 'READ')).resolves.toBe(
      'TEAM',
    );
    await expect(service.getDataScope('u1', 'FAULTS', 'DELETE')).resolves.toBe(
      null,
    );
  });
});

describe('RbacService.resolveScopeIds (DataScope.md §6)', () => {
  const tenantId = 't1';

  it('returns NONE (deny by default) when no permission is granted', async () => {
    const prisma: PrismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue(grantsUser('EMP', [])) },
      employee: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u1', 'FAULTS', [
      'READ',
    ]);
    expect(scope).toEqual({ kind: 'NONE' });
  });

  it('returns ALL for ALL-scoped grants without touching employees', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('ADMIN_MANAGER', [
              { module: 'FAULTS', action: 'READ', dataScope: 'ALL' },
            ]),
          ),
      },
      employee: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u1', 'FAULTS', [
      'READ',
    ]);
    expect(scope).toEqual({ kind: 'ALL' });
    expect(prisma.employee.findFirst).not.toHaveBeenCalled();
  });

  it('OWN keeps the caller userId even without an employee record', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('EMPLOYEE', [
              { module: 'FAULTS', action: 'READ', dataScope: 'OWN' },
            ]),
          ),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u1', 'FAULTS', [
      'READ',
    ]);
    expect(scope).toEqual({ kind: 'IDS', employeeIds: [], userIds: ['u1'] });
  });

  it('TEAM includes self plus direct reports (employee + user ids)', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('MANAGER', [
              { module: 'FAULTS', action: 'READ', dataScope: 'TEAM' },
            ]),
          ),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e-mgr', branchId: null }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'e-a', userId: 'u-a' },
          { id: 'e-b', userId: null },
        ]),
      },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u-mgr', 'FAULTS', [
      'READ',
    ]);
    expect(scope.kind).toBe('IDS');
    if (scope.kind === 'IDS') {
      expect([...scope.employeeIds].sort()).toEqual(['e-a', 'e-b', 'e-mgr']);
      expect([...scope.userIds].sort()).toEqual(['u-a', 'u-mgr']);
    }
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reportingManagerId: { in: ['e-mgr'] },
        }),
      }),
    );
  });

  it('TEAM walks indirect reports through the hierarchy (DataScope.md §8)', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('MANAGER', [
              { module: 'FAULTS', action: 'READ', dataScope: 'TEAM' },
            ]),
          ),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e-mgr', branchId: null }),
        findMany: jest
          .fn()
          // level 1: direct report (a supervisor)
          .mockResolvedValueOnce([{ id: 'e-sup', userId: 'u-sup' }])
          // level 2: the supervisor's own report
          .mockResolvedValueOnce([{ id: 'e-worker', userId: 'u-worker' }])
          .mockResolvedValue([]),
      },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u-mgr', 'FAULTS', [
      'READ',
    ]);
    expect(scope.kind).toBe('IDS');
    if (scope.kind === 'IDS') {
      expect([...scope.employeeIds].sort()).toEqual([
        'e-mgr',
        'e-sup',
        'e-worker',
      ]);
      expect([...scope.userIds].sort()).toEqual(['u-mgr', 'u-sup', 'u-worker']);
    }
  });

  it('TEAM hierarchy walk is cycle-safe', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('MANAGER', [
              { module: 'FAULTS', action: 'READ', dataScope: 'TEAM' },
            ]),
          ),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e-mgr', branchId: null }),
        // Corrupted data: the report "manages" the manager (a cycle)
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'e-a', userId: 'u-a' }])
          .mockResolvedValue([{ id: 'e-mgr', userId: 'u-mgr' }]),
      },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u-mgr', 'FAULTS', [
      'READ',
    ]);
    expect(scope.kind).toBe('IDS');
    if (scope.kind === 'IDS') {
      expect([...scope.employeeIds].sort()).toEqual(['e-a', 'e-mgr']);
    }
  });

  it('DEPARTMENT resolves to the members of the caller department', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('DEPT_HEAD', [
              { module: 'FAULTS', action: 'READ', dataScope: 'DEPARTMENT' },
            ]),
          ),
      },
      employee: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'e-head', departmentId: 'dep-1' }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'e-head', userId: 'u-head' },
          { id: 'e-x', userId: 'u-x' },
        ]),
      },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u-head', 'FAULTS', [
      'READ',
    ]);
    expect(scope.kind).toBe('IDS');
    if (scope.kind === 'IDS') {
      expect([...scope.employeeIds].sort()).toEqual(['e-head', 'e-x']);
    }
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ departmentId: 'dep-1' }),
      }),
    );
  });

  it('REGION without a region assignment denies', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('RM', [
              { module: 'FAULTS', action: 'READ', dataScope: 'REGION' },
            ]),
          ),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e1', regionId: null }),
        findMany: jest.fn(),
      },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u1', 'FAULTS', [
      'READ',
    ]);
    expect(scope).toEqual({ kind: 'NONE' });
  });

  it('BUSINESS_UNIT resolves to the members of the caller business unit', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('BU_HEAD', [
              { module: 'FAULTS', action: 'READ', dataScope: 'BUSINESS_UNIT' },
            ]),
          ),
      },
      employee: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'e-bu', businessUnitId: 'bu-1' }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'e-member', userId: 'u-member' }]),
      },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u-bu', 'FAULTS', [
      'READ',
    ]);
    expect(scope.kind).toBe('IDS');
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessUnitId: 'bu-1' }),
      }),
    );
  });

  it('CUSTOM unions the caller with active override targets', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('AUDITOR', [
              { module: 'FAULTS', action: 'READ', dataScope: 'CUSTOM' },
            ]),
          ),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e-self' }),
        findMany: jest
          .fn()
          // EMPLOYEE targets
          .mockResolvedValueOnce([{ id: 'e-granted', userId: 'u-granted' }])
          // BRANCH targets
          .mockResolvedValueOnce([{ id: 'e-branch', userId: 'u-branch' }]),
      },
      userScopeOverride: {
        findMany: jest.fn().mockResolvedValue([
          { scopeType: 'EMPLOYEE', targetId: 'e-granted' },
          { scopeType: 'BRANCH', targetId: 'br-1' },
        ]),
      },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u-self', 'FAULTS', [
      'READ',
    ]);
    expect(scope.kind).toBe('IDS');
    if (scope.kind === 'IDS') {
      expect([...scope.employeeIds].sort()).toEqual([
        'e-branch',
        'e-granted',
        'e-self',
      ]);
      expect([...scope.userIds].sort()).toEqual([
        'u-branch',
        'u-granted',
        'u-self',
      ]);
    }
    expect(prisma.userScopeOverride?.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId, userId: 'u-self' }),
      }),
    );
  });

  it('CUSTOM with no override rules keeps only the caller visible', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('AUDITOR', [
              { module: 'FAULTS', action: 'READ', dataScope: 'CUSTOM' },
            ]),
          ),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e-self' }),
        findMany: jest.fn(),
      },
      userScopeOverride: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u-self', 'FAULTS', [
      'READ',
    ]);
    expect(scope).toEqual({
      kind: 'IDS',
      employeeIds: ['e-self'],
      userIds: ['u-self'],
    });
    expect(prisma.employee.findMany).not.toHaveBeenCalled();
  });

  it('denies unknown stored scope levels (deny by default)', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('LEGACY', [
              { module: 'FAULTS', action: 'READ', dataScope: 'EVERYTHING' },
            ]),
          ),
      },
      employee: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    const service = makeService(prisma);
    await expect(service.getDataScope('u1', 'FAULTS', 'READ')).resolves.toBe(
      null,
    );
    const scope = await service.resolveScopeIds(tenantId, 'u1', 'FAULTS', [
      'READ',
    ]);
    expect(scope).toEqual({ kind: 'NONE' });
  });

  it('BRANCH without a branch assignment denies', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(
            grantsUser('MANAGER', [
              { module: 'FAULTS', action: 'READ', dataScope: 'BRANCH' },
            ]),
          ),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e1', branchId: null }),
        findMany: jest.fn(),
      },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u1', 'FAULTS', [
      'READ',
    ]);
    expect(scope).toEqual({ kind: 'NONE' });
  });

  it('picks the broadest scope across multiple actions', async () => {
    const prisma: PrismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(
          grantsUser('HYBRID', [
            { module: 'ATTENDANCE', action: 'READ_OWN', dataScope: 'OWN' },
            { module: 'ATTENDANCE', action: 'READ', dataScope: 'ALL' },
          ]),
        ),
      },
      employee: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    const service = makeService(prisma);
    const scope = await service.resolveScopeIds(tenantId, 'u1', 'ATTENDANCE', [
      'READ',
      'READ_OWN',
    ]);
    expect(scope).toEqual({ kind: 'ALL' });
  });
});

describe('RbacService scope where-builders', () => {
  const prisma: PrismaMock = {
    user: { findUnique: jest.fn() },
    employee: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  const service = makeService(prisma);

  it('employeeScopeWhere: ALL → no filter, NONE → null, IDS → in-list', () => {
    expect(service.employeeScopeWhere({ kind: 'ALL' })).toEqual({});
    expect(service.employeeScopeWhere({ kind: 'NONE' })).toBeNull();
    expect(
      service.employeeScopeWhere(
        { kind: 'IDS', employeeIds: ['e1'], userIds: ['u1'] },
        'id',
      ),
    ).toEqual({ id: { in: ['e1'] } });
  });

  it('userScopeWhere: IDS → OR over the given user columns', () => {
    expect(
      service.userScopeWhere(
        { kind: 'IDS', employeeIds: [], userIds: ['u1', 'u2'] },
        ['assignedToId', 'createdBy'],
      ),
    ).toEqual({
      OR: [
        { assignedToId: { in: ['u1', 'u2'] } },
        { createdBy: { in: ['u1', 'u2'] } },
      ],
    });
    expect(service.userScopeWhere({ kind: 'NONE' }, ['createdBy'])).toBeNull();
    expect(service.userScopeWhere({ kind: 'ALL' }, ['createdBy'])).toEqual({});
  });
});
