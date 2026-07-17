import { PrismaClient } from '@prisma/client';

/**
 * Seeds the public subscription plan catalog (website pricing page) and the
 * UNASSIGNED holding tenant that website-originated checkouts are parked
 * against until a real tenant is provisioned. Idempotent (upsert by code).
 *
 * Amounts are in paise. Confirm figures with Sales before go-live.
 */
export async function seedBillingPlans(prisma: PrismaClient): Promise<void> {
  const plans = [
    {
      code: 'starter',
      name: 'Starter',
      tagline: 'For small field teams getting organised.',
      amount: 499900,
      maxFieldStaff: 25,
      highlighted: false,
      isCustom: false,
      sortOrder: 1,
      features: [
        'Up to 25 field users',
        'GPS attendance & geofencing',
        'Field visit tracking',
        'Offline-first mobile app',
        'Email support',
      ],
    },
    {
      code: 'growth',
      name: 'Growth',
      tagline: 'For scaling operations that need more control.',
      amount: 1499900,
      maxFieldStaff: 150,
      highlighted: true,
      isCustom: false,
      sortOrder: 2,
      features: [
        'Up to 150 field users',
        'Everything in Starter',
        'Fault management & SLA escalation',
        'Leave, claims & payroll',
        'Dashboards & exportable reports',
        'Priority support',
      ],
    },
    {
      code: 'enterprise',
      name: 'Enterprise',
      tagline: 'For large, multi-branch organizations.',
      amount: 3999900,
      maxFieldStaff: null,
      highlighted: false,
      isCustom: false,
      sortOrder: 3,
      features: [
        'Unlimited field users',
        'Everything in Growth',
        'Multi-tenant & white-label branding',
        'Connection Map',
        'Branded Customer Portal',
        'Dedicated success manager & SLA',
      ],
    },
    {
      code: 'custom',
      name: 'Custom',
      tagline: 'Tailored to how your organization actually runs.',
      amount: 0,
      maxFieldStaff: null,
      highlighted: false,
      isCustom: true,
      sortOrder: 4,
      features: [
        'Custom user tiers & modules',
        'On-premise or private-cloud deployment',
        'Custom integrations & data migration',
        'Bespoke SLAs and onboarding',
        'Volume & multi-year pricing',
      ],
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        tagline: p.tagline,
        amount: p.amount,
        maxFieldStaff: p.maxFieldStaff,
        highlighted: p.highlighted,
        isCustom: p.isCustom,
        sortOrder: p.sortOrder,
        features: p.features,
        isActive: true,
      },
      create: {
        code: p.code,
        name: p.name,
        tagline: p.tagline,
        amount: p.amount,
        currency: 'INR',
        interval: 'MONTHLY',
        maxFieldStaff: p.maxFieldStaff,
        highlighted: p.highlighted,
        isCustom: p.isCustom,
        sortOrder: p.sortOrder,
        features: p.features,
      },
    });
  }
  console.log(`Upserted ${plans.length} subscription plans`);

  // Holding tenant for website checkouts that have no tenant yet.
  await prisma.tenant.upsert({
    where: { code: 'UNASSIGNED' },
    update: {},
    create: {
      code: 'UNASSIGNED',
      name: 'Unassigned (billing holding)',
      status: 'SUSPENDED',
      subscriptionStatus: 'TRIAL',
    },
  });
  console.log('Upserted UNASSIGNED holding tenant');
}
