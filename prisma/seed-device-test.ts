import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import { syncSystemRolePermissions } from '../apps/api/src/rbac/permission-catalog';

dotenv.config();

/**
 * Role-based accounts for device and acceptance testing (Test Plan: "Device
 * and UAT checklist"). One login per scenario, all in one existing tenant:
 *
 *   dev-admin     ADMIN_MANAGER          admin portal; sets entitlements, geofences
 *   dev-manager   DEVICE_TEST_MANAGER    team-scoped manager (mobile + portal)
 *   dev-office    EMPLOYEE               office staff (punches, not tracked)
 *   dev-field1    EMPLOYEE_FIELD_STAFF   field staff, reports to dev-manager
 *   dev-field2    EMPLOYEE_FIELD_STAFF   second field staff (isolation, team list)
 *   dev-new       EMPLOYEE_FIELD_STAFF   rewound to the start of onboarding
 *
 * Each employee gets this year's leave entitlement (12 annual + 6 sick unless a
 * balance already exists) and, when DEVICE_TEST_GEOFENCE is given, an assigned
 * "Device test site" geofence so punches are allowed.
 *
 * Guarded like seed-gate-test.ts: NODE_ENV must be development or test and
 * ALLOW_TEST_RESET_ENDPOINT must be true — set both only on the throwaway
 * container that runs this, never on the live API. The password is never
 * printed. Idempotent: re-running resets passwords, revokes sessions and
 * rewinds dev-new; balances already present are left alone.
 *
 * Usage (prod VM, see memory gate-test-accounts-prod for the container recipe):
 *   NODE_ENV=development ALLOW_TEST_RESET_ENDPOINT=true \
 *   DEVICE_TEST_TENANT_CODE=GATE100 DEVICE_TEST_PASSWORD='<choose one>' \
 *   DEVICE_TEST_GEOFENCE='12.9716,77.5946,150' \
 *   npx tsx prisma/seed-device-test.ts
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    new Pool({ connectionString: process.env.DATABASE_URL }),
  ),
});

const MANAGER_ROLE = 'DEVICE_TEST_MANAGER';
const DOMAIN = 'pingforce.test';

/** Team-scoped oversight plus the self-service actions a manager punches with. */
const MANAGER_GRANTS: readonly [string, string, string][] = [
  ['EMPLOYEES', 'READ', 'TEAM'],
  ['ATTENDANCE', 'READ', 'TEAM'],
  ['ATTENDANCE', 'CREATE', 'OWN'],
  ['ATTENDANCE', 'READ_OWN', 'OWN'],
  ['DEVICES', 'BIND', 'OWN'],
  ['DEVICES', 'REQUEST_CHANGE', 'OWN'],
  ['LEAVES', 'READ', 'TEAM'],
  ['LEAVES', 'READ_OWN', 'OWN'],
  ['LEAVES', 'CREATE', 'OWN'],
  ['LEAVES', 'APPROVE', 'TEAM'],
  ['VISITS', 'READ', 'TEAM'],
  ['VISITS', 'CREATE', 'TEAM'],
  ['VISITS', 'ASSIGN', 'TEAM'],
  ['VISITS', 'APPROVE', 'TEAM'],
  ['TRACKING', 'VIEW_LIVE', 'TEAM'],
  ['FAULTS', 'READ', 'TEAM'],
  ['FAULTS', 'CREATE', 'TEAM'],
  ['FAULTS', 'ASSIGN', 'TEAM'],
  ['LEADS', 'READ', 'TEAM'],
  ['LEADS', 'CREATE', 'TEAM'],
  ['LEADS', 'UPDATE', 'TEAM'],
  ['MASTER_DATA', 'READ', 'ALL'],
  ['GEOFENCES', 'READ', 'ALL'],
  ['NETWORK', 'READ', 'TEAM'],
];

interface AccountSpec {
  readonly key: string;
  readonly roleCode: string;
  readonly employeeCode?: string;
  readonly fieldStaff?: boolean;
  readonly reportsToManager?: boolean;
  /** Start of the onboarding chain: password change, profile, device binding. */
  readonly onboarding?: boolean;
}

const ACCOUNTS: readonly AccountSpec[] = [
  { key: 'admin', roleCode: 'ADMIN_MANAGER' },
  { key: 'manager', roleCode: MANAGER_ROLE, employeeCode: 'DEVTEST-MGR' },
  { key: 'office', roleCode: 'EMPLOYEE', employeeCode: 'DEVTEST-OFFICE' },
  {
    key: 'field1',
    roleCode: 'EMPLOYEE_FIELD_STAFF',
    employeeCode: 'DEVTEST-FIELD-1',
    fieldStaff: true,
    reportsToManager: true,
  },
  {
    key: 'field2',
    roleCode: 'EMPLOYEE_FIELD_STAFF',
    employeeCode: 'DEVTEST-FIELD-2',
    fieldStaff: true,
    reportsToManager: true,
  },
  {
    key: 'new',
    roleCode: 'EMPLOYEE_FIELD_STAFF',
    employeeCode: 'DEVTEST-NEW',
    fieldStaff: true,
    onboarding: true,
  },
];

function assertEnabled(): void {
  const env = process.env.NODE_ENV;
  if (
    (env !== 'development' && env !== 'test') ||
    process.env.ALLOW_TEST_RESET_ENDPOINT !== 'true'
  ) {
    throw new Error(
      'Refusing to seed device-test accounts. Requires NODE_ENV=development|test ' +
        'and ALLOW_TEST_RESET_ENDPOINT=true on this one-off process.',
    );
  }
}

function parseGeofence(
  raw: string | undefined,
): { latitude: number; longitude: number; radiusMeters: number } | null {
  if (!raw) return null;
  const [latitude, longitude, radius] = raw.split(',').map(Number);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    throw new Error('DEVICE_TEST_GEOFENCE must be "lat,lng[,radiusMeters]".');
  }
  return {
    latitude,
    longitude,
    radiusMeters: Number.isFinite(radius) && radius > 0 ? radius : 150,
  };
}

async function main(): Promise<void> {
  assertEnabled();
  const tenantCode = process.env.DEVICE_TEST_TENANT_CODE;
  const password = process.env.DEVICE_TEST_PASSWORD;
  if (!tenantCode) throw new Error('DEVICE_TEST_TENANT_CODE is not set.');
  if (!password || password.length < 12)
    throw new Error('DEVICE_TEST_PASSWORD must be at least 12 characters.');
  const site = parseGeofence(process.env.DEVICE_TEST_GEOFENCE);

  const tenant = await prisma.tenant.findFirst({
    where: { code: tenantCode, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) throw new Error(`No tenant with code ${tenantCode}.`);
  const tenantId = tenant.id;
  const passwordHash = await argon2.hash(password);

  // Roles: system roles get the catalogue grants, the manager role its own.
  const roleIds = new Map<string, string>();
  for (const code of new Set(ACCOUNTS.map((a) => a.roleCode))) {
    const role = await prisma.role.upsert({
      where: { tenantId_code: { tenantId, code } },
      update: {},
      create: {
        tenantId,
        code,
        name: code === MANAGER_ROLE ? 'Device test manager' : code,
      },
      select: { id: true },
    });
    roleIds.set(code, role.id);
    await syncSystemRolePermissions(prisma, role.id, code);
  }
  const managerRoleId = roleIds.get(MANAGER_ROLE)!;
  for (const [module, action, dataScope] of MANAGER_GRANTS) {
    const permission = await prisma.permission.findUnique({
      where: { module_action: { module, action } },
      select: { id: true },
    });
    if (!permission) continue;
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: managerRoleId,
          permissionId: permission.id,
        },
      },
      update: { dataScope },
      create: { roleId: managerRoleId, permissionId: permission.id, dataScope },
    });
  }

  // Leave types to entitle: the tenant's own, or two defaults if it has none.
  let leaveTypes = await prisma.leaveType.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, code: true },
  });
  if (leaveTypes.length === 0) {
    for (const [code, name] of [
      ['ANNUAL', 'Annual Leave'],
      ['SICK', 'Sick Leave'],
    ] as const)
      await prisma.leaveType.create({ data: { tenantId, code, name } });
    leaveTypes = await prisma.leaveType.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, code: true },
    });
  }

  const geofence = site
    ? ((await prisma.geofence.findFirst({
        where: { tenantId, name: 'Device test site', deletedAt: null },
        select: { id: true },
      })) ??
      (await prisma.geofence.create({
        data: { tenantId, name: 'Device test site', active: true, ...site },
        select: { id: true },
      })))
    : null;
  if (geofence && site)
    await prisma.geofence.update({
      where: { id: geofence.id },
      data: { ...site, active: true },
    });

  const year = new Date().getUTCFullYear();
  const employeeIds = new Map<string, string>();
  for (const account of ACCOUNTS) {
    const email = `dev-${account.key}@${DOMAIN}`;
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email } },
      update: {
        passwordHash,
        roleId: roleIds.get(account.roleCode)!,
        status: 'ACTIVE',
        deletedAt: null,
        mustChangePassword: account.onboarding ?? false,
        failedLoginCount: 0,
        lockedUntil: null,
        tokenVersion: { increment: 1 },
      },
      create: {
        tenantId,
        email,
        passwordHash,
        roleId: roleIds.get(account.roleCode)!,
        status: 'ACTIVE',
        mustChangePassword: account.onboarding ?? false,
      },
      select: { id: true },
    });
    const lastName = account.key[0].toUpperCase() + account.key.slice(1);
    if (account.onboarding) {
      await prisma.userProfile.deleteMany({ where: { userId: user.id } });
    } else {
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, firstName: 'Device', lastName },
      });
    }

    if (account.employeeCode) {
      const employee = await prisma.employee.upsert({
        where: {
          tenantId_employeeCode: {
            tenantId,
            employeeCode: account.employeeCode,
          },
        },
        update: {
          userId: user.id,
          employmentStatus: 'ACTIVE',
          deletedAt: null,
          isFieldStaff: account.fieldStaff ?? false,
          ...(account.onboarding ? { deviceBoundAt: null } : {}),
        },
        create: {
          tenantId,
          userId: user.id,
          employeeCode: account.employeeCode,
          firstName: 'Device',
          lastName,
          primaryEmail: email,
          employmentStatus: 'ACTIVE',
          isFieldStaff: account.fieldStaff ?? false,
        },
        select: { id: true },
      });
      employeeIds.set(account.key, employee.id);
      if (account.onboarding) {
        await prisma.employeeDevice.deleteMany({
          where: { tenantId, employeeId: employee.id },
        });
        await prisma.deviceChangeRequest.deleteMany({
          where: { tenantId, employeeId: employee.id },
        });
      }
      for (const type of leaveTypes) {
        const totalDays = type.code.toUpperCase().includes('SICK') ? 6 : 12;
        await prisma.leaveBalance.upsert({
          where: {
            tenantId_employeeId_leaveTypeId_year: {
              tenantId,
              employeeId: employee.id,
              leaveTypeId: type.id,
              year,
            },
          },
          update: {},
          create: {
            tenantId,
            employeeId: employee.id,
            leaveTypeId: type.id,
            year,
            totalDays,
            availableDays: totalDays,
          },
        });
      }
      if (geofence)
        await prisma.employeeGeofence.upsert({
          where: {
            employeeId_geofenceId: {
              employeeId: employee.id,
              geofenceId: geofence.id,
            },
          },
          update: { deletedAt: null },
          create: {
            tenantId,
            employeeId: employee.id,
            geofenceId: geofence.id,
          },
        });
    }

    // Start every run signed out.
    const now = new Date();
    await prisma.session.updateMany({
      where: { tenantId, userId: user.id, revokedAt: null },
      data: { revokedAt: now, revokeReason: 'DEVICE_TEST_SEED' },
    });
    await prisma.refreshToken.updateMany({
      where: { tenantId, userId: user.id, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  const managerEmployeeId = employeeIds.get('manager')!;
  for (const account of ACCOUNTS.filter((a) => a.reportsToManager))
    await prisma.employee.update({
      where: { id: employeeIds.get(account.key)! },
      data: { reportingManagerId: managerEmployeeId },
    });

  console.log(`Device-test accounts ready in ${tenantCode}:`);
  for (const a of ACCOUNTS)
    console.log(`  dev-${a.key}@${DOMAIN}  (${a.roleCode})`);
  console.log(
    `Leave entitlements for ${year}: ${leaveTypes.length} type(s). ` +
      (geofence
        ? 'Geofence "Device test site" assigned.'
        : 'No geofence given: assign one in the admin portal before punching.'),
  );
  console.log('Password: the value of DEVICE_TEST_PASSWORD (not printed).');
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(
      String(error instanceof Error ? error.message : error).replace(
        /postgres(ql)?:\/\/\S+/g,
        'postgres://<redacted>',
      ),
    );
    process.exit(1);
  });
