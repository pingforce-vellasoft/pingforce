import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLE_GRANTS,
  syncSystemRolePermissions,
} from '../apps/api/src/rbac/permission-catalog';
import { seedDefaultNotificationTemplates } from '../apps/api/src/notifications/default-templates';
import { seedDemoNetwork } from './seed-demo-network';
import { seedBillingPlans } from './seed-billing-plans';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Upsert the full permission catalog
  for (const p of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: { description: p.description },
      create: {
        module: p.module,
        action: p.action,
        description: p.description,
      },
    });
  }
  console.log(`Upserted ${PERMISSION_CATALOG.length} catalog permissions`);

  // 2. Backfill permission grants for existing system roles in every tenant.
  //    Idempotent: createMany with skipDuplicates, so re-running is safe and
  //    custom grants added by tenants are never removed.
  const systemRoleCodes = Object.keys(SYSTEM_ROLE_GRANTS);
  const systemRoles = await prisma.role.findMany({
    where: { code: { in: systemRoleCodes } },
    select: { id: true, code: true, tenantId: true },
  });

  for (const role of systemRoles) {
    await syncSystemRolePermissions(prisma, role.id, role.code);
  }
  console.log(
    `Backfilled grants for ${systemRoles.length} system roles across tenants`,
  );

  // 3. Provision default notification templates for every tenant.
  //    Idempotent: createMany with skipDuplicates — tenant-customised
  //    templates (same tenantId+name) are never overwritten.
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  for (const tenant of tenants) {
    await seedDefaultNotificationTemplates(prisma, tenant.id);
  }
  console.log(
    `Seeded default notification templates for ${tenants.length} tenants`,
  );

  // 4. Optional demo Connection Map network (3.7_ConnectionMap) — opt-in so
  //    production seeds never create fixture data.
  if (process.env.SEED_DEMO_NETWORK === 'true' && tenants.length > 0) {
    await seedDemoNetwork(prisma, tenants[0].id);
  }

  // 5. Create Super Admin user — password must come from the environment.
  const superAdminEmail =
    process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@pingforce.in';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;

  if (!superAdminPassword) {
    // Skipping is only safe when a usable super admin already exists. Without
    // this check the seed exits 0 on a fresh database and every login fails
    // with "Invalid super admin credentials" — the account was never created.
    const existing = await prisma.superAdmin.count({
      where: { status: 'ACTIVE', deletedAt: null },
    });

    if (existing === 0) {
      throw new Error(
        'SEED_SUPER_ADMIN_PASSWORD is not set and no active super admin exists. ' +
          'The deployment would have no way to log in. Re-run with ' +
          'SEED_SUPER_ADMIN_PASSWORD set to provision the account.',
      );
    }

    console.log(
      `SEED_SUPER_ADMIN_PASSWORD not set — keeping ${existing} existing super admin(s) untouched.`,
    );
  } else {
    const passwordHash = await argon2.hash(superAdminPassword);
    // Reactivate on update: a suspended or soft-deleted account would otherwise
    // keep failing login even after a successful reseed.
    const admin = await prisma.superAdmin.upsert({
      where: { email: superAdminEmail },
      update: { passwordHash, status: 'ACTIVE', deletedAt: null },
      create: {
        email: superAdminEmail,
        name: 'Super Admin',
        passwordHash,
        status: 'ACTIVE',
      },
    });
    console.log(`Upserted super admin user: ${admin.email}`);
  }

  // Subscription plan catalog + billing holding tenant.
  await seedBillingPlans(prisma);

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
