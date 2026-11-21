import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';
import { codeSentTo } from './mailbox';

/**
 * Cross-cutting rules: the role matrix, customer portal identities on staff
 * routes, the one-vs-many geofence policy and an off-site visit start.
 */

const tag = () => randomUUID().slice(0, 8);

test('X-PERM-01 role matrix: each role gets exactly what its grants allow', async ({
  request,
  accounts,
}) => {
  // [path, admin, field employee, no-grant role]; null = not asserted
  // (the admin has no employee record, so self-service routes are moot).
  const matrix: [string, number | null, number, number][] = [
    ['employees', 200, 403, 403],
    ['customers', 200, 403, 403],
    ['leads', 200, 403, 403],
    ['faults', 200, 403, 403],
    ['faults/assigned', 200, 200, 403],
    ['visits', 200, 403, 403],
    ['visits/assigned', null, 200, 403],
    ['leaves/my', null, 200, 403],
    ['leaves/pending', 200, 403, 403],
    ['attendance/today', null, 200, 403],
    // The admin portal's attendance pages (READ covers READ_OWN routes).
    ['attendance/daily-logs', 200, 200, 403],
    ['attendance/logs', 200, 200, 403],
    ['network/connections/assigned', null, 200, 403],
    ['audit', 200, 403, 403],
    ['rbac/roles', 200, 403, 403],
    ['devices', 200, 403, 403],
    ['tenants', 403, 403, 403],
  ];
  const roles = [
    ['admin', accounts.admin],
    ['employee', accounts.employee],
    ['restricted', accounts.restricted],
  ] as const;
  const mismatches: string[] = [];
  for (const [path, ...expected] of matrix) {
    for (let i = 0; i < roles.length; i++) {
      const [name, session] = roles[i];
      const status = (
        await request.get(`/api/v1/${path}`, { headers: bearer(session) })
      ).status();
      if (expected[i] !== null && status !== expected[i])
        mismatches.push(
          `${name} GET /${path}: ${status}, expected ${expected[i]}`,
        );
    }
  }
  // Writes the field role must not make.
  for (const [method, path, body] of [
    ['post', 'leads', { leadNumber: `QA-${tag()}`, firstName: 'X' }],
    ['post', 'customers', { customerCode: `QA-${tag()}`, legalName: 'X' }],
    [
      'post',
      'employees',
      { employeeCode: `QA-${tag()}`, firstName: 'X', lastName: 'Y' },
    ],
    [
      'post',
      'visits',
      { purpose: 'X', plannedStartAt: new Date().toISOString() },
    ],
    ['post', 'rbac/roles', { name: 'X', code: `QA_${tag()}` }],
  ] as const) {
    const status = (
      await request[method](`/api/v1/${path}`, {
        headers: bearer(accounts.employee),
        data: body,
      })
    ).status();
    if (status !== 403)
      mismatches.push(`employee ${method.toUpperCase()} /${path}: ${status}`);
  }
  expect(mismatches, 'role matrix mismatches').toEqual([]);
});

test('P2-RBAC-08 a customer portal identity cannot use staff routes', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const customer = await request.post('/api/v1/customers', {
    headers: admin,
    data: {
      customerCode: `QA-PORTAL-${tag()}`,
      legalName: 'QA portal customer',
    },
  });
  expect(customer.status(), await customer.text()).toBe(201);
  const customerId = (await customer.json()).id as string;
  const email = `portal-${tag()}@qa.pingforce.test`;
  const invite = await request.post(
    `/api/v1/customers/${customerId}/portal/invites`,
    {
      headers: admin,
      data: { email, firstName: 'Portal', lastName: 'User' },
    },
  );
  expect(invite.status(), await invite.text()).toBe(201);
  const { inviteToken } = (await invite.json()) as { inviteToken: string };

  const since = new Date();
  const verify = await request.post('/api/v1/portal/auth/invite/verify', {
    data: { token: inviteToken },
  });
  expect(verify.ok(), await verify.text()).toBeTruthy();
  const otp = await codeSentTo(request, email, since);
  const password = `Qa!portal${tag()}X9`;
  const activated = await request.post('/api/v1/portal/auth/invite/activate', {
    data: { token: inviteToken, otp, password },
  });
  expect(activated.ok(), await activated.text()).toBeTruthy();
  const login = await request.post('/api/v1/portal/auth/login', {
    data: { tenantCode: 'QA_ALPHA', email, password },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const portal = (await login.json()) as Session;

  // Portal routes work for it ...
  const me = await request.get('/api/v1/portal/me', {
    headers: bearer(portal),
  });
  expect(me.status(), await me.text()).toBe(200);
  // ... staff routes never do.
  for (const path of [
    'employees',
    'faults',
    'customers',
    'leaves/my',
    // JWT-only staff self-service routes (no RbacGuard):
    'auth/me',
    'auth/sessions',
    'auth/login-history',
    'notifications/feed',
  ]) {
    const staffRoute = await request.get(`/api/v1/${path}`, {
      headers: bearer(portal),
    });
    expect(
      [401, 403],
      `portal token on /${path}: ${staffRoute.status()}`,
    ).toContain(staffRoute.status());
  }
  const employees = await request.get('/api/v1/employees', {
    headers: bearer(portal),
  });
  if (employees.status() === 403)
    expect(await employees.text()).toContain('Customer portal accounts');
  // And a staff token is not a portal identity.
  const staffOnPortal = await request.get('/api/v1/portal/me', {
    headers: admin,
  });
  expect([401, 403]).toContain(staffOnPortal.status());
  // The invite cannot be used twice.
  const reuse = await request.post('/api/v1/portal/auth/invite/activate', {
    data: { token: inviteToken, otp, password },
  });
  expect(reuse.ok(), 'invite reused').toBeFalsy();
});

async function employeeIdByCode(
  request: APIRequestContext,
  admin: Session,
  code: string,
): Promise<string> {
  const rows = (await (
    await request.get('/api/v1/employees?take=100', { headers: bearer(admin) })
  ).json()) as { id: string; employeeCode: string }[];
  const row = rows.find((r) => r.employeeCode === code);
  expect(row, code).toBeTruthy();
  return row!.id;
}

test('P2-SET-02/P3-GEO-05 one geofence per employee vs many follows the policy', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const base = '/api/v1/attendance/geofence';
  const policy = (allow: boolean) =>
    request.put(`${base}/assignment-policy`, {
      headers: admin,
      data: { allowMultipleGeofencesPerEmployee: allow },
    });
  const site = async (latitude: number) => {
    const created = await request.post(base, {
      headers: admin,
      data: {
        name: `QA policy ${tag()}`,
        latitude,
        longitude: 77.59,
        radiusMeters: 100,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    return (await created.json()).id as string;
  };
  const worker = await request.post('/api/v1/employees', {
    headers: admin,
    data: {
      employeeCode: `QA-POL-${tag()}`,
      firstName: 'Policy',
      lastName: 'Test',
    },
  });
  const workerId = (await worker.json()).id as string;
  const first = await site(14.1);
  const second = await site(14.2);
  const assign = (siteId: string, reassign = false) =>
    request.post(`${base}/${siteId}/employees`, {
      headers: admin,
      data: { employeeIds: [workerId], reassign },
    });
  try {
    expect((await policy(false)).ok()).toBeTruthy();
    expect((await assign(first)).ok()).toBeTruthy();
    // Single mode: a second site needs an explicit reassign.
    expect((await assign(second)).status(), 'second site in single mode').toBe(
      409,
    );
    const moved = await assign(second, true);
    expect(moved.ok(), await moved.text()).toBeTruthy();
    const afterMove = await (
      await request.get(`${base}/employee/${workerId}`, { headers: admin })
    ).json();
    expect(afterMove.geofences.map((g: { id: string }) => g.id)).toEqual([
      second,
    ]);

    // Many mode: both at once.
    expect((await policy(true)).ok()).toBeTruthy();
    expect((await assign(first)).ok()).toBeTruthy();
    const both = await (
      await request.get(`${base}/employee/${workerId}`, { headers: admin })
    ).json();
    expect(both.geofences.map((g: { id: string }) => g.id).sort()).toEqual(
      [first, second].sort(),
    );
    // Field staff cannot change the policy.
    const staffPolicy = await request.put(`${base}/assignment-policy`, {
      headers: bearer(accounts.employee),
      data: { allowMultipleGeofencesPerEmployee: false },
    });
    expect(staffPolicy.status()).toBe(403);
  } finally {
    await policy(false);
    for (const id of [first, second])
      await request.delete(`${base}/${id}`, { headers: admin });
  }
});

test('P3-VIS-03 starting a visit off site is recorded as not GPS-validated', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const staff = bearer(accounts.employee);
  const employeeId = await employeeIdByCode(
    request,
    accounts.admin,
    'QA-EMPLOYEE',
  );
  const site = await request.post('/api/v1/attendance/geofence', {
    headers: admin,
    data: {
      name: `QA visit site ${tag()}`,
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 100,
    },
  });
  const geofenceId = (await site.json()).id as string;
  const visit = await request.post('/api/v1/visits', {
    headers: admin,
    data: {
      purpose: `QA off-site ${tag()}`,
      plannedStartAt: new Date(Date.now() + 3_600_000).toISOString(),
      geofenceId,
    },
  });
  expect(visit.status(), await visit.text()).toBe(201);
  const id = (await visit.json()).id as string;
  const act = (
    session: Record<string, string>,
    action: string,
    data: object = {},
  ) =>
    request.post(`/api/v1/visits/${id}/${action}`, { headers: session, data });
  try {
    expect((await act(admin, 'assign', { employeeId })).ok()).toBeTruthy();
    expect((await act(staff, 'accept')).ok()).toBeTruthy();
    // About 60 km from the site.
    const started = await act(staff, 'start', {
      latitude: 13.5,
      longitude: 77.5946,
    });
    if (started.ok()) {
      expect((await started.json()).gpsValidated).toBe(false);
    } else {
      expect(started.status(), await started.text()).toBeLessThan(500);
    }
  } finally {
    await act(staff, 'abort', { notes: 'QA clean up' });
    await act(admin, 'cancel', { notes: 'QA clean up' });
    await request.delete(`/api/v1/attendance/geofence/${geofenceId}`, {
      headers: admin,
    });
  }
});
