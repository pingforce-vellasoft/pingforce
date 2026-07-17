import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { PortalUserGuard } from './portal-user.guard';

/**
 * Identity-boundary tests (3.8_CustomerPortal BR-9.1): the portal surface
 * only accepts customer tokens; staff and super-admin identities are
 * rejected outright.
 */

function contextWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PortalUserGuard', () => {
  const guard = new PortalUserGuard();

  it('accepts a customer portal identity', () => {
    const ctx = contextWithUser({
      userId: 'pu1',
      tenantId: 't1',
      customerId: 'c1',
      userType: 'CUSTOMER',
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects staff identities', () => {
    const ctx = contextWithUser({
      userId: 'u1',
      tenantId: 't1',
      roleCode: 'ADMIN_MANAGER',
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects super-admin identities', () => {
    const ctx = contextWithUser({
      userId: 'sa1',
      tenantId: 'SYSTEM',
      roleCode: 'SUPER_ADMIN',
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects customer tokens missing customerId', () => {
    const ctx = contextWithUser({
      userId: 'pu1',
      tenantId: 't1',
      userType: 'CUSTOMER',
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects missing user context', () => {
    const ctx = contextWithUser(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
