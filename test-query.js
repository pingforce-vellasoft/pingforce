const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying DEFAULT tenant...');
  const tenant = await prisma.tenant.findUnique({ where: { code: 'DEFAULT' } });
  console.log(tenant);
  const allTenants = await prisma.tenant.findMany();
  console.log(
    'All tenants codes:',
    allTenants.map((t) => t.code),
  );
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
