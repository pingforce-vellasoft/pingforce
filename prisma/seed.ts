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
      create: { module: p.module, action: p.action, description: p.description },
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

  // 3. Create Super Admin user — password must come from the environment.
  const superAdminEmail =
    process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@pingforce.in';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;

  if (!superAdminPassword) {
    console.warn(
      'SEED_SUPER_ADMIN_PASSWORD is not set — skipping super admin creation. ' +
        'Set it in the environment to (re)provision the super admin account.',
    );
  } else {
    const passwordHash = await argon2.hash(superAdminPassword);
    const admin = await prisma.superAdmin.upsert({
      where: { email: superAdminEmail },
      update: { passwordHash },
      create: {
        email: superAdminEmail,
        name: 'Super Admin',
        passwordHash,
        status: 'ACTIVE',
      },
    });
    console.log(`Upserted super admin user: ${admin.email}`);
  }

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
