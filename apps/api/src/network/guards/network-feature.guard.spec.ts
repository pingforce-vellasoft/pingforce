import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { NetworkFeatureGuard } from './network-feature.guard';

/**
 * Connection Map feature gate (3.7_ConnectionMap §6). Contract:
 * SYSTEM tenant bypasses; disabled flag blocks everyone in the tenant;
 * admins pass once enabled; employees are capped by employeeAccess
 * (NONE blocks all, VIEW blocks mutations, EDIT/FULL pass).
 */

function makeContext(user: unknown, method = 'GET'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, method }),
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(
  settings: {
    connectionMapEnabled: boolean;
    connectionMapEmployeeAccess: string;
  } | null,
) {
  const prisma = {
    tenantSetting: {
      findUnique: jest.fn().mockResolvedValue(settings),
    },
  };
  const cache = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
  return {
    guard: new NetworkFeatureGuard(prisma as never, cache as never),
    prisma,
    cache,
  };
}

const admin = { userId: 'u1', tenantId: 't1', roleCode: 'ADMIN_MANAGER' };
const employee = { userId: 'u2', tenantId: 't1', roleCode: 'EMPLOYEE' };
const superAdmin = {
  userId: 's1',
  tenantId: 'SYSTEM',
  roleCode: 'SUPER_ADMIN',
};

describe('NetworkFeatureGuard', () => {
  it('throws 403 when the user context is missing', async () => {
    const { guard } = makeGuard(null);
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('always allows the SYSTEM tenant (Super Admin)', async () => {
    const { guard, prisma } = makeGuard(null);
    await expect(guard.canActivate(makeContext(superAdmin))).resolves.toBe(
      true,
    );
    expect(prisma.tenantSetting.findUnique).not.toHaveBeenCalled();
  });

  it('blocks everyone when the module is disabled for the tenant', async () => {
    const { guard } = makeGuard({
      connectionMapEnabled: false,
      connectionMapEmployeeAccess: 'FULL',
    });
    await expect(guard.canActivate(makeContext(admin))).rejects.toThrow(
      'The Connection Map module is not enabled for this tenant',
    );
  });

  it('treats missing tenant settings as disabled', async () => {
    const { guard } = makeGuard(null);
    await expect(guard.canActivate(makeContext(admin))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows tenant admins once enabled, regardless of employee cap', async () => {
    const { guard } = makeGuard({
      connectionMapEnabled: true,
      connectionMapEmployeeAccess: 'NONE',
    });
    await expect(guard.canActivate(makeContext(admin, 'POST'))).resolves.toBe(
      true,
    );
  });

  it('blocks employees when employeeAccess is NONE', async () => {
    const { guard } = makeGuard({
      connectionMapEnabled: true,
      connectionMapEmployeeAccess: 'NONE',
    });
    await expect(guard.canActivate(makeContext(employee))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('gives VIEW employees read access but blocks mutations', async () => {
    const { guard } = makeGuard({
      connectionMapEnabled: true,
      connectionMapEmployeeAccess: 'VIEW',
    });
    await expect(guard.canActivate(makeContext(employee, 'GET'))).resolves.toBe(
      true,
    );
    await expect(
      guard.canActivate(makeContext(employee, 'POST')),
    ).rejects.toThrow('view-only');
  });

  it('lets EDIT employees mutate (RBAC still applies downstream)', async () => {
    const { guard } = makeGuard({
      connectionMapEnabled: true,
      connectionMapEmployeeAccess: 'EDIT',
    });
    await expect(
      guard.canActivate(makeContext(employee, 'PATCH')),
    ).resolves.toBe(true);
  });

  it('serves the access config from cache on repeat calls', async () => {
    const { guard, prisma, cache } = makeGuard({
      connectionMapEnabled: true,
      connectionMapEmployeeAccess: 'FULL',
    });
    await guard.canActivate(makeContext(admin));
    (cache.get as jest.Mock).mockResolvedValue({
      enabled: true,
      employeeAccess: 'FULL',
    });
    await guard.canActivate(makeContext(admin));
    expect(prisma.tenantSetting.findUnique).toHaveBeenCalledTimes(1);
  });
});
