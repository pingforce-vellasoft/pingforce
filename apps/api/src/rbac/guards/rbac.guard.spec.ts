import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard';
import { RbacService } from '../rbac.service';

/**
 * RbacGuard authorization decisions (RBAC.md). The reflector and RbacService
 * are mocked; the guard's contract is: no decorator → allow, missing user →
 * 403, SYSTEM tenant → allow, otherwise defer to hasPermission.
 */

function makeContext(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(
  requiredPermission: { module: string; action: string } | undefined,
  hasPermission: boolean,
) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredPermission),
  } as unknown as Reflector;
  const rbacService = {
    hasPermission: jest.fn().mockResolvedValue(hasPermission),
  } as unknown as RbacService;
  return { guard: new RbacGuard(reflector, rbacService), rbacService };
}

describe('RbacGuard', () => {
  it('allows routes without a @RequirePermission decorator', async () => {
    const { guard } = makeGuard(undefined, false);
    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true);
  });

  it('throws 403 when the user context is missing', async () => {
    const { guard } = makeGuard({ module: 'FAULTS', action: 'READ' }, true);
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(makeContext({}))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('bypasses permission checks for SYSTEM tenant (super admin)', async () => {
    const { guard, rbacService } = makeGuard(
      { module: 'TENANTS', action: 'DELETE' },
      false,
    );
    await expect(
      guard.canActivate(makeContext({ userId: 'sa1', tenantId: 'SYSTEM' })),
    ).resolves.toBe(true);
    expect(rbacService.hasPermission).not.toHaveBeenCalled();
  });

  it('allows when RbacService grants the permission', async () => {
    const { guard, rbacService } = makeGuard(
      { module: 'FAULTS', action: 'READ' },
      true,
    );
    await expect(
      guard.canActivate(makeContext({ userId: 'u1', tenantId: 't1' })),
    ).resolves.toBe(true);
    expect(rbacService.hasPermission).toHaveBeenCalledWith(
      'u1',
      'FAULTS',
      'READ',
    );
  });

  it('throws 403 when RbacService denies the permission', async () => {
    const { guard } = makeGuard({ module: 'FAULTS', action: 'DELETE' }, false);
    await expect(
      guard.canActivate(makeContext({ userId: 'u1', tenantId: 't1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects customer portal identities before consulting permissions (3.8 BR-9.1)', async () => {
    const { guard, rbacService } = makeGuard(
      { module: 'CUSTOMERS', action: 'READ' },
      true, // even if the service would grant it
    );
    await expect(
      guard.canActivate(
        makeContext({
          userId: 'pu1',
          tenantId: 't1',
          customerId: 'c1',
          userType: 'CUSTOMER',
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(rbacService.hasPermission).not.toHaveBeenCalled();
  });
});

describe('RbacGuard temporary password', () => {
  it('blocks a guarded route until the temporary password is changed', async () => {
    const { guard, rbacService } = makeGuard(
      { module: 'EMPLOYEES', action: 'READ' },
      true,
    );
    await expect(
      guard.canActivate(
        makeContext({ userId: 'u1', tenantId: 't1', mustChangePassword: true }),
      ),
    ).rejects.toMatchObject({
      response: { errorCode: 'PASSWORD_CHANGE_REQUIRED' },
    });
    expect(rbacService.hasPermission).not.toHaveBeenCalled();
  });

  it('lets an unguarded route through (change-password itself)', async () => {
    const { guard } = makeGuard(undefined, false);
    await expect(
      guard.canActivate(
        makeContext({ userId: 'u1', tenantId: 't1', mustChangePassword: true }),
      ),
    ).resolves.toBe(true);
  });
});

describe('RbacGuard READ covers READ_OWN', () => {
  function guardWith(grants: string[]) {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue({ module: 'ATTENDANCE', action: 'READ_OWN' }),
    } as unknown as Reflector;
    const rbacService = {
      hasPermission: jest.fn(async (_u: string, _m: string, action: string) =>
        grants.includes(action),
      ),
    } as unknown as RbacService;
    return new RbacGuard(reflector, rbacService);
  }
  const ctx = () => makeContext({ userId: 'u1', tenantId: 't1' });

  it('lets an office role with READ open a READ_OWN route', async () => {
    await expect(guardWith(['READ']).canActivate(ctx())).resolves.toBe(true);
  });

  it('still lets the field role with READ_OWN through', async () => {
    await expect(guardWith(['READ_OWN']).canActivate(ctx())).resolves.toBe(
      true,
    );
  });

  it('refuses a role with neither', async () => {
    await expect(guardWith(['CREATE']).canActivate(ctx())).rejects.toThrow(
      'Missing required permission',
    );
  });
});
