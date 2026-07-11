import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) {
    console.log('No tenants found.');
    return;
  }

  const allPermissions = await prisma.permission.findMany();

  for (const tenant of tenants) {
    console.log(`Processing tenant: ${tenant.name}`);

    // Create Admin Role
    const adminRole = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'ADMIN_MANAGER' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Admin / Manager',
        code: 'ADMIN_MANAGER',
        description: 'Management access',
        isSystem: true,
      },
    });

    // Create Employee Role
    const employeeRole = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'EMPLOYEE' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Employee',
        code: 'EMPLOYEE',
        description: 'Standard employee access',
        isSystem: true,
      },
    });

    // Wipe existing permissions to ensure a clean slate (revoke unauthorized access)
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: { in: [adminRole.id, employeeRole.id] },
      },
    });

    // Assign scoped permissions to Admin
    const adminModules = [
      'USERS',
      'ROLES',
      'GEOFENCES',
      'ATTENDANCE',
      'TRACKING',
    ];
    const adminPerms = allPermissions.filter((p: any) =>
      adminModules.includes(p.module),
    );

    for (const perm of adminPerms) {
      await prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: perm.id },
      });
    }

    // Assign specific permissions to Employee
    const employeePerms = allPermissions.filter(
      (p: any) =>
        p.module === 'ATTENDANCE' && ['READ_OWN', 'CREATE'].includes(p.action),
    );

    for (const perm of employeePerms) {
      await prisma.rolePermission.create({
        data: { roleId: employeeRole.id, permissionId: perm.id },
      });
    }
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
