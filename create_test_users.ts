import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('No tenant found');
    return;
  }

  const passwordHash = await argon2.hash('Test@123');

  const roles = await prisma.role.findMany({ where: { tenantId: tenant.id } });
  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    roleMap[r.code] = r.id;
  }

  const testUsers = [
    {
      email: 'manager@pingforce.in',
      roleCode: 'ADMIN_MANAGER',
      firstName: 'Test',
      lastName: 'Manager',
    },
    {
      email: 'employee@pingforce.in',
      roleCode: 'EMPLOYEE_FIELD_STAFF',
      firstName: 'Test',
      lastName: 'Employee',
    },
    {
      email: 'customer@pingforce.in',
      roleCode: 'CUSTOMER',
      firstName: 'Test',
      lastName: 'Customer',
    },
  ];

  for (const tu of testUsers) {
    if (!roleMap[tu.roleCode]) {
      console.log(`Role ${tu.roleCode} not found in DB!`);
      continue;
    }

    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: tu.email } },
      update: {
        passwordHash: passwordHash,
        roleId: roleMap[tu.roleCode],
      },
      create: {
        tenantId: tenant.id,
        email: tu.email,
        phone: '+910000000' + Math.floor(100 + Math.random() * 900),
        clientCode: 'TEST_' + tu.roleCode,
        passwordHash: passwordHash,
        roleId: roleMap[tu.roleCode],
        profile: {
          create: {
            firstName: tu.firstName,
            lastName: tu.lastName,
          },
        },
      },
    });
    console.log(`Upserted test user: ${tu.email}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
