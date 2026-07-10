import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { code: 'DEFAULT' } });
  console.log('Tenant:', tenant);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
