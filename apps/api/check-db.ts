import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('--- ALL TENANTS ---');
  console.log(JSON.stringify(tenants, null, 2));

  const users = await prisma.user.findMany({ include: { role: true } });
  console.log('--- ALL USERS ---');
  console.log(
    JSON.stringify(
      users.map((u) => ({
        email: u.email,
        role: u.role?.code,
        tenantId: u.tenantId,
      })),
      null,
      2,
    ),
  );
}
main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
