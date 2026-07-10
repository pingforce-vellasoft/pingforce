const { PrismaClient } = require('./node_modules/@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { code: 'DEFAULT' } });
  console.log('Tenant:', tenant);
  const user = await prisma.user.findFirst();
  console.log('User:', user);
  if (user) {
    const isValid = await argon2.verify(user.passwordHash, 'Admin@123');
    console.log('Password valid:', isValid);
  }
}
main().finally(() => prisma.$disconnect());
