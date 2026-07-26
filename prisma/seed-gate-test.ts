import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Provisions the two accounts needed to walk the mobile gate chain
 * (docs/testing/gate_chain_testing.md).
 *
 * Deliberately separate from the main seed: these accounts exist only to be
 * rewound by POST /api/v1/testing/reset-gate-chain, and that endpoint refuses
 * any address without the `gatetest` marker. Seeding them into every
 * environment's baseline would put permanently-resettable logins in production.
 *
 * Guarded the same way as the reset endpoint — NODE_ENV must be development or
 * test, and ALLOW_TEST_RESET_ENDPOINT must be true. Without both, this refuses
 * to run.
 *
 * Idempotent: re-running rewinds the accounts to the start of the chain rather
 * than creating duplicates, so it doubles as a local reset when the API is not
 * running.
 *
 * Usage:
 *   NODE_ENV=development ALLOW_TEST_RESET_ENDPOINT=true \
 *   GATE_TEST_TENANT_CODE=ACME \
 *   GATE_TEST_PASSWORD='TestPass123!' \
 *   npx tsx prisma/seed-gate-test.ts
 */

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** Account A — walks gates 1 → 1d. Must be an employee, or 1c-bis never fires. */
const WALKER_EMAIL = 'gatetest@pingforce.test';
/** Account B — gate 5 only. Same low-privilege role; never reset. */
const RBAC_EMAIL = 'gatetest-rbac@pingforce.test';

/**
 * Both accounts use the least-privileged system role. A field employee carries
 * no `reports.view`, which is exactly what makes account B bounce off /reports
 * at gate 5.
 */
const ROLE_CODE = 'EMPLOYEE_FIELD_STAFF';

function assertEnabled(): void {
  const env = process.env.NODE_ENV;
  const optedIn = process.env.ALLOW_TEST_RESET_ENDPOINT === 'true';
  if ((env !== 'development' && env !== 'test') || !optedIn) {
    throw new Error(
      'Refusing to seed gate-chain test accounts. Requires ' +
        'NODE_ENV=development|test and ALLOW_TEST_RESET_ENDPOINT=true. ' +
        `Got NODE_ENV=${env ?? '<unset>'}, ` +
        `ALLOW_TEST_RESET_ENDPOINT=${process.env.ALLOW_TEST_RESET_ENDPOINT ?? '<unset>'}.`,
    );
  }
}

async function main(): Promise<void> {
  assertEnabled();

  const tenantCode = process.env.GATE_TEST_TENANT_CODE;
  if (!tenantCode) {
    throw new Error(
      'GATE_TEST_TENANT_CODE is not set — pass the code of an existing tenant ' +
        '(the same code testers type at login).',
    );
  }

  const password = process.env.GATE_TEST_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error(
      'GATE_TEST_PASSWORD is not set, or is shorter than 8 characters.',
    );
  }

  const tenant = await prisma.tenant.findFirst({
    where: { code: tenantCode, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!tenant) {
    throw new Error(
      `No tenant with code ${tenantCode}. Create the tenant first, then re-run.`,
    );
  }

  const role = await prisma.role.findFirst({
    where: { tenantId: tenant.id, code: ROLE_CODE },
    select: { id: true },
  });
  if (!role) {
    throw new Error(
      `Tenant ${tenantCode} has no ${ROLE_CODE} role. Run the main seed first ` +
        '(npx prisma db seed) so the system roles exist.',
    );
  }

  const passwordHash = await argon2.hash(password);

  const walker = await upsertGateAccount({
    tenantId: tenant.id,
    roleId: role.id,
    email: WALKER_EMAIL,
    passwordHash,
    employeeCode: 'GATETEST-01',
    firstName: 'Gate',
    lastName: 'Walker',
    // Account A must own an Employee record: the API reports non-employee
    // logins as already device-bound, so gate 1c-bis would never fire.
    withEmployee: true,
  });

  const rbac = await upsertGateAccount({
    tenantId: tenant.id,
    roleId: role.id,
    email: RBAC_EMAIL,
    passwordHash,
    employeeCode: 'GATETEST-02',
    firstName: 'Gate',
    lastName: 'Rbac',
    // Account B never walks the chain — it logs in and deep-links. Giving it a
    // profile and no employee record means it lands straight on /home, which is
    // where a gate-5 test starts.
    withEmployee: false,
  });

  console.log('');
  console.log('Gate-chain test accounts ready');
  console.log('──────────────────────────────────────────────');
  console.log(`Tenant code   : ${tenantCode}  (${tenant.name})`);
  console.log(`Password      : ${password}   (both accounts)`);
  console.log('');
  console.log('Account A — walks gates 1 → 1d');
  console.log(`  email       : ${WALKER_EMAIL}`);
  console.log(`  userId      : ${walker}`);
  console.log(
    '  state       : password change + profile + device binding armed',
  );
  console.log('');
  console.log('Account B — gate 5 (RBAC)');
  console.log(`  email       : ${RBAC_EMAIL}`);
  console.log(`  userId      : ${rbac}`);
  console.log('  state       : chain clear, lands on /home');
  console.log('  test        : deep-link to /reports — should bounce to /home');
  console.log('');
  console.log('Note: permissionsFlowSeen (gate 1d) is device-local. Clear app');
  console.log('storage, or use the debug panel (long-press the login logo).');
  console.log('');
}

interface GateAccountInput {
  readonly tenantId: string;
  readonly roleId: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly withEmployee: boolean;
}

/**
 * Creates or rewinds one test account.
 *
 * On re-run this resets the account to its starting state rather than erroring,
 * so the script is also the offline equivalent of the reset endpoint.
 */
async function upsertGateAccount(input: GateAccountInput): Promise<string> {
  const {
    tenantId,
    roleId,
    email,
    passwordHash,
    employeeCode,
    firstName,
    lastName,
    withEmployee,
  } = input;

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId, email } },
    update: {
      passwordHash,
      roleId,
      status: 'ACTIVE',
      deletedAt: null,
      // Account A re-arms gate 1b; account B starts past it.
      mustChangePassword: withEmployee,
      // Invalidate any token minted before this rewind.
      tokenVersion: { increment: 1 },
    },
    create: {
      tenantId,
      email,
      passwordHash,
      roleId,
      status: 'ACTIVE',
      mustChangePassword: withEmployee,
    },
    select: { id: true },
  });

  if (withEmployee) {
    // Gate 1c: no profile means !isOnboarded.
    await prisma.userProfile.deleteMany({ where: { userId: user.id } });

    const employee = await prisma.employee.upsert({
      where: { tenantId_employeeCode: { tenantId, employeeCode } },
      update: {
        userId: user.id,
        // Gate 1c-bis.
        deviceBoundAt: null,
        employmentStatus: 'ACTIVE',
        deletedAt: null,
      },
      create: {
        tenantId,
        employeeCode,
        userId: user.id,
        firstName,
        lastName,
        primaryEmail: email,
        employmentStatus: 'ACTIVE',
        isFieldStaff: true,
      },
      select: { id: true },
    });

    // Hard delete rather than revoke: a revoked row still occupies the
    // (tenantId, deviceId) unique slot that bindDevice upserts into, so the
    // same handset could not re-bind. Test data only.
    await prisma.employeeDevice.deleteMany({
      where: { tenantId, employeeId: employee.id },
    });
    await prisma.deviceChangeRequest.deleteMany({
      where: { tenantId, employeeId: employee.id },
    });
  } else {
    // Account B skips the chain: give it a profile so gate 1c is satisfied and
    // it lands on /home ready for the RBAC test.
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: { firstName, lastName },
      create: { userId: user.id, firstName, lastName },
    });
  }

  // Any live session predates the rewind — cut it so the handset returns to
  // login instead of resuming mid-chain with stale cached flags.
  const now = new Date();
  await prisma.session.updateMany({
    where: { tenantId, userId: user.id, revokedAt: null },
    data: { revokedAt: now, revokeReason: 'GATE_TEST_SEED' },
  });
  await prisma.refreshToken.updateMany({
    where: { tenantId, userId: user.id, revokedAt: null },
    data: { revokedAt: now, revokeReason: 'GATE_TEST_SEED' },
  });

  return user.id;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
