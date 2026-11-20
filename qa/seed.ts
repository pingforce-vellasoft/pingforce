import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { assertQaDatabase } from './lib/safety.mjs';
import {
  PERMISSION_CATALOG,
  syncSystemRolePermissions,
} from '../apps/api/src/rbac/permission-catalog';

// Do not load the workspace .env: it may contain a live database connection.
assertQaDatabase(process.env);
const password = process.env.QA_TEST_PASSWORD;
if (!password || password.length < 16)
  throw new Error('QA_TEST_PASSWORD must have at least 16 characters');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seed(): Promise<void> {
  const passwordHash = await hash(password!);
  await prisma.$transaction(
    async (tx) => {
      for (const permission of PERMISSION_CATALOG) {
        await tx.permission.upsert({
          where: {
            module_action: {
              module: permission.module,
              action: permission.action,
            },
          },
          create: permission,
          update: {},
        });
      }
      for (const code of ['QA_ALPHA', 'QA_BETA']) {
        const tenant = await tx.tenant.upsert({
          where: { code },
          update: {},
          create: { code, name: `Synthetic ${code}`, timezone: 'Asia/Kolkata' },
        });
        const leaveType = await tx.leaveType.upsert({
          where: { tenantId_code: { tenantId: tenant.id, code: 'QA_ANNUAL' } },
          update: {},
          create: {
            tenantId: tenant.id,
            code: 'QA_ANNUAL',
            name: 'QA Annual Leave',
          },
        });
        for (const [name, roleCode] of [
          ['admin', 'ADMIN_MANAGER'],
          ['employee', 'EMPLOYEE_FIELD_STAFF'],
          ['restricted', 'QA_NO_GRANTS'],
        ]) {
          const role = await tx.role.upsert({
            where: { tenantId_code: { tenantId: tenant.id, code: roleCode } },
            update: {},
            create: { tenantId: tenant.id, code: roleCode, name: roleCode },
          });
          await syncSystemRolePermissions(tx, role.id, roleCode);
          const user = await tx.user.upsert({
            where: {
              tenantId_email: {
                tenantId: tenant.id,
                email: `${name}@qa.pingforce.test`,
              },
            },
            // Rerunning never resets an existing password/session or test history.
            update: {},
            create: {
              tenantId: tenant.id,
              email: `${name}@qa.pingforce.test`,
              passwordHash,
              roleId: role.id,
              profile: { create: { firstName: 'QA', lastName: name } },
            },
          });
          if (name === 'employee') {
            const existing = await tx.employee.findFirst({
              where: { tenantId: tenant.id, userId: user.id, deletedAt: null },
            });
            const employee =
              existing ??
              (await tx.employee.create({
                data: {
                  tenantId: tenant.id,
                  userId: user.id,
                  employeeCode: 'QA-EMPLOYEE',
                  firstName: 'QA',
                  lastName: 'Employee',
                },
              }));
            const year = new Date().getUTCFullYear();
            await tx.leaveBalance.upsert({
              where: {
                tenantId_employeeId_leaveTypeId_year: {
                  tenantId: tenant.id,
                  employeeId: employee.id,
                  leaveTypeId: leaveType.id,
                  year,
                },
              },
              update: {},
              create: {
                tenantId: tenant.id,
                employeeId: employee.id,
                leaveTypeId: leaveType.id,
                year,
                totalDays: 30,
                availableDays: 30,
              },
            });
          }
        }
      }
    },
    { timeout: 60_000 },
  );
  console.log(
    'QA_ALPHA and QA_BETA synthetic fixtures ready; credentials were not logged.',
  );
}

seed()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    // Show the cause, never the connection string: redact any postgres URL.
    const redact = (text: string): string =>
      text.replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, 'postgresql://<redacted>');
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? ` [${String((error as { code?: unknown }).code)}]`
        : '';
    const message = error instanceof Error ? error.message : String(error);
    console.error(`QA seed failed${code}: ${redact(message).slice(0, 2000)}`);
    process.exitCode = 1;
  });
