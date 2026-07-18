import { SubscriptionsService } from './subscriptions.service';

/**
 * Focused on the no-card free-trial checkout branch: a plan with trialDays > 0
 * must provision a TRIALING subscription (no gateway call) and return a trial
 * result carrying the trial end date.
 */
describe('SubscriptionsService — free trial checkout', () => {
  const holdingTenantId = 'holding-tenant-id';

  function build(planTrialDays: number) {
    const created = { id: 'sub-1', tenantId: holdingTenantId };
    const prisma = {
      plan: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'plan-1',
          code: 'free-trial',
          trialDays: planTrialDays,
          amount: 0,
          currency: 'INR',
          isCustom: false,
        }),
      },
      tenant: {
        findFirst: jest.fn().mockResolvedValue({ id: holdingTenantId }),
      },
      tenantSubscription: {
        create: jest.fn().mockImplementation(({ data }) => ({
          ...created,
          ...data,
        })),
      },
    };
    const registry = {
      defaultGateway: jest.fn().mockReturnValue('RAZORPAY'),
      get: jest.fn(),
    };
    const service = new SubscriptionsService(
      prisma as never,
      registry as never,
    );
    return { service, prisma, registry };
  }

  it('creates a TRIALING subscription without touching the gateway', async () => {
    const { service, prisma, registry } = build(30);

    const result = await service.createCheckout({
      planCode: 'free-trial',
      customerEmail: 'admin@acme.test',
    } as never);

    expect(result.mode).toBe('trial');
    expect(result.subscriptionId).toBe('sub-1');
    expect(result.trialEnd).toBeInstanceOf(Date);
    // No gateway subscription was created for a no-card trial.
    expect(registry.get).not.toHaveBeenCalled();

    const createArg = prisma.tenantSubscription.create.mock.calls[0][0];
    expect(createArg.data.status).toBe('TRIALING');
    expect(createArg.data.tenantId).toBe(holdingTenantId);
    expect(createArg.data.trialEnd).toBeInstanceOf(Date);
    // ~30 days out (allow a few seconds of slack).
    const days =
      (createArg.data.trialEnd.getTime() - Date.now()) / (24 * 3600 * 1000);
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('does not take the trial branch for a paid plan (trialDays = 0)', async () => {
    const { service } = build(0);
    // Paid plan with amount 0 + not custom falls through to contact_sales in
    // this mock (no gateway configured path is separately covered); just assert
    // it is NOT treated as a trial.
    const result = await service.createCheckout({
      planCode: 'starter',
      customerEmail: 'admin@acme.test',
    } as never);
    expect(result.mode).not.toBe('trial');
  });
});
