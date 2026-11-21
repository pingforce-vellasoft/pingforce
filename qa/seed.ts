import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { assertQaDatabase } from './lib/safety.mjs';
import { seedBillingPlans } from '../prisma/seed-billing-plans';
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
        // Connection Map is a per-tenant module (Super Admin switch). QA_ALPHA
        // has it on with view-only field staff; QA_BETA keeps the default
        // (off) so the gate itself is covered.
        if (code === 'QA_ALPHA')
          await tx.tenantSetting.upsert({
            where: { tenantId: tenant.id },
            update: {},
            create: {
              tenantId: tenant.id,
              connectionMapEnabled: true,
              connectionMapEmployeeAccess: 'VIEW',
              customerPortalEnabled: true,
            },
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
          // Dedicated to auth-limits.spec.ts: locking or force-logging-out
          // these never disturbs the shared sessions other tests use.
          ['lockout', 'EMPLOYEE_FIELD_STAFF'],
          ['sessions', 'EMPLOYEE_FIELD_STAFF'],
          ['devices', 'EMPLOYEE_FIELD_STAFF'],
          ['punch', 'EMPLOYEE_FIELD_STAFF'],
          ['punch2', 'EMPLOYEE_FIELD_STAFF'],
          // Password reset test: its password changes during the run.
          ['reset', 'EMPLOYEE_FIELD_STAFF'],
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
          // Device binding and signed-punch tests bind handsets, so they get
          // their own employee records and never touch QA-EMPLOYEE's state.
          const ownEmployee: Record<string, string> = {
            devices: 'QA-DEVICES',
            punch: 'QA-PUNCH',
            punch2: 'QA-PUNCH-2',
          };
          if (ownEmployee[name]) {
            const existing = await tx.employee.findFirst({
              where: { tenantId: tenant.id, userId: user.id, deletedAt: null },
            });
            if (!existing)
              await tx.employee.create({
                data: {
                  tenantId: tenant.id,
                  userId: user.id,
                  employeeCode: ownEmployee[name],
                  firstName: 'QA',
                  lastName: name,
                },
              });
          }
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
            // This year and next: leave tests book next year's days
            // (qa/tests/leave-days.ts) so they never fall in the past.
            const thisYear = new Date().getUTCFullYear();
            for (const year of [thisYear, thisYear + 1])
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
  // Synthetic platform operator for the Super Admin cases (auth-limits).
  await prisma.superAdmin.upsert({
    where: { email: 'super@qa.pingforce.test' },
    update: {},
    create: {
      email: 'super@qa.pingforce.test',
      passwordHash,
      name: 'QA Super Admin',
    },
  });
  // Plan catalogue + the UNASSIGNED holding tenant, for the signup tests.
  await seedBillingPlans(prisma as never);
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
