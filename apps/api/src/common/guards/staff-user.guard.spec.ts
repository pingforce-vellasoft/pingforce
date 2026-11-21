import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { StaffUserGuard } from './staff-user.guard';

const ctx = (user: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('StaffUserGuard', () => {
  const guard = new StaffUserGuard();

  it('refuses a customer portal identity', () => {
    expect(() =>
      guard.canActivate(ctx({ userId: 'p1', userType: 'CUSTOMER' })),
    ).toThrow(ForbiddenException);
  });

  it('lets staff and super admins through', () => {
    expect(guard.canActivate(ctx({ userId: 'u1', tenantId: 't1' }))).toBe(true);
    expect(guard.canActivate(ctx({ userId: 's1', tenantId: 'SYSTEM' }))).toBe(
      true,
    );
  });
});
