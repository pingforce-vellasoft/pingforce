import { randomUUID } from 'node:crypto';
import { test, expect, bearer, credentials, login } from './fixtures';

const protectedPaths = [
  'auth/me',
  'employees',
  'customers',
  'attendance/today',
  'attendance/policy',
  'leaves/my',
  'leaves/types',
  'faults',
];

for (const path of protectedPaths) {
  test(`AUTH-001 anonymous access rejected: ${path}`, async ({ request }) => {
    const response = await request.get(`/api/v1/${path}`, { maxRedirects: 0 });
    expect(response.status()).toBe(401);
    expect(await response.text()).not.toMatch(/node_modules|\bat .*\.ts:\d/);
  });
}

test('AUTH-002 malformed credentials rejected', async ({ request }) => {
  const response = await request.post('/api/v1/auth/login', {
    data: { email: 'invalid', password: '' },
  });
  expect(response.status()).toBe(400);
});

test('AUTH-003 wrong password rejected', async ({ request }) => {
  const response = await request.post('/api/v1/auth/login', {
    data: { ...credentials('admin'), password: randomUUID() },
  });
  expect(response.status()).toBe(401);
});

test('AUTH-004 employee cannot enter admin portal', async ({ request }) => {
  const response = await request.post('/api/v1/auth/login', {
    data: { ...credentials('employee'), portalType: 'ADMIN_PORTAL' },
  });
  expect(response.status()).toBe(401);
});

test('AUTH-005 rotation and logout revoke refresh tokens', async ({
  request,
}) => {
  const session = await login(request, 'admin');
  const refreshed = await request.post('/api/v1/auth/refresh', {
    data: { refreshToken: session.refreshToken },
  });
  expect(refreshed.status()).toBe(200);
  const rotated = await refreshed.json();
  expect(rotated.refreshToken).not.toBe(session.refreshToken);
  expect(
    (
      await request.post('/api/v1/auth/logout', { headers: bearer(rotated) })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.post('/api/v1/auth/refresh', {
        data: { refreshToken: rotated.refreshToken },
      })
    ).status(),
  ).toBe(401);
});

for (const path of [
  'employees',
  'customers',
  'faults',
  'leaves/my',
  'attendance/today',
]) {
  test(`RBAC-001 authenticated account without grants denied: ${path}`, async ({
    request,
    accounts,
  }) => {
    expect(
      (
        await request.get(`/api/v1/${path}`, {
          headers: bearer(accounts.restricted),
        })
      ).status(),
    ).toBe(403);
  });
}

for (const path of [
  'attendance/today',
  'attendance/policy',
  'leaves/types',
  'leaves/my',
  'leaves/my-balance',
]) {
  test(`CORE-001 employee self service: ${path}`, async ({
    request,
    accounts,
  }) => {
    expect(
      (
        await request.get(`/api/v1/${path}`, {
          headers: bearer(accounts.employee),
        })
      ).status(),
    ).toBe(200);
  });
}

for (const query of ['take=101', 'skip=-1', 'year=1999', 'status=UNKNOWN']) {
  test(`LEAVE-001 rejects invalid query ${query}`, async ({
    request,
    accounts,
  }) => {
    expect(
      (
        await request.get(`/api/v1/leaves/my?${query}`, {
          headers: bearer(accounts.employee),
        })
      ).status(),
    ).toBe(400);
  });
}

test('LEAVE-002 rejects missing fields and injected tenant', async ({
  request,
  accounts,
}) => {
  const response = await request.post('/api/v1/leaves/request', {
    headers: bearer(accounts.employee),
    data: { tenantId: randomUUID() },
  });
  expect(response.status()).toBe(400);
});

test('FAULT-001 create/read and cross-tenant isolation', async ({
  request,
  accounts,
}) => {
  const title = `QA fault ${randomUUID()}`;
  const response = await request.post('/api/v1/faults', {
    headers: bearer(accounts.admin),
    data: {
      faultNumber: `QA-${randomUUID()}`,
      title,
      description: 'Synthetic regression fault',
    },
  });
  expect(response.status()).toBe(201);
  const fault = await response.json();
  expect(fault.id).toBeTruthy();
  const own = await request.get(`/api/v1/faults/${fault.id}`, {
    headers: bearer(accounts.admin),
  });
  expect(own.status()).toBe(200);
  expect((await own.json()).title).toBe(title);
  const other = await request.get(`/api/v1/faults/${fault.id}`, {
    headers: bearer(accounts.other),
  });
  expect(other.status()).toBe(404);
  expect(await other.text()).not.toContain(title);
  const deniedWrite = await request.patch(`/api/v1/faults/${fault.id}`, {
    headers: bearer(accounts.other),
    data: { title: 'Cross-tenant overwrite' },
  });
  expect(deniedWrite.status()).toBe(404);
  expect(
    (
      await (
        await request.get(`/api/v1/faults/${fault.id}`, {
          headers: bearer(accounts.admin),
        })
      ).json()
    ).title,
  ).toBe(title);
});

test('FAULT-002 rejects invalid input', async ({ request, accounts }) => {
  expect(
    (
      await request.post('/api/v1/faults', {
        headers: bearer(accounts.admin),
        data: { title: '', priority: 'UNKNOWN' },
      })
    ).status(),
  ).toBe(400);
});

test('LEAVE-003 reserve then withdraw restores balance', async ({
  request,
  accounts,
}) => {
  const headers = bearer(accounts.employee);
  const typesResponse = await request.get('/api/v1/leaves/types', { headers });
  expect(typesResponse.status()).toBe(200);
  const types: { id: string; code: string }[] = await typesResponse.json();
  const type = types.find((item) => item.code === 'QA_ANNUAL');
  expect(type).toBeTruthy();
  const balances = async (): Promise<{
    availableDays: number;
    reservedDays: number;
  }> => {
    const response = await request.get('/api/v1/leaves/my-balance', {
      headers,
    });
    expect(response.status()).toBe(200);
    const rows: {
      leaveTypeId: string;
      availableDays: number;
      reservedDays: number;
    }[] = await response.json();
    const row = rows.find((item) => item.leaveTypeId === type!.id);
    expect(row).toBeTruthy();
    return row!;
  };
  const before = await balances();
  const day = `${new Date().getUTCFullYear()}-12-15`;
  const response = await request.post('/api/v1/leaves/request', {
    headers,
    data: {
      leaveTypeId: type!.id,
      startDate: day,
      endDate: day,
      reason: 'QA withdrawal regression',
    },
  });
  expect(response.status()).toBe(201);
  const leave = await response.json();
  try {
    expect(leave.status).toBe('PENDING');
    const reserved = await balances();
    expect(reserved.reservedDays).toBe(before.reservedDays + 1);
    expect(reserved.availableDays).toBe(before.availableDays - 1);
  } finally {
    expect(
      (
        await request.post(`/api/v1/leaves/${leave.id}/withdraw`, { headers })
      ).status(),
    ).toBe(201);
  }
  const after = await balances();
  expect(after.availableDays).toBe(before.availableDays);
  expect(after.reservedDays).toBe(before.reservedDays);
});

for (const [duration, startDate, endDate, expectedStatus, days] of [
  ['FULL_DAY', '2026-10-19', '2026-10-19', 201, 1],
  ['FIRST_HALF', '2026-10-19', '2026-10-19', 201, 0.5],
  ['SECOND_HALF', '2026-10-19', '2026-10-20', 400, 0],
  ['FULL_DAY', '2026-12-31', '2027-01-01', 400, 0],
  ['FULL_DAY', '2026-10-20', '2026-10-19', 400, 0],
] as const) {
  test(`LEAVE-006 preview ${duration} ${startDate}..${endDate}`, async ({
    request,
    accounts,
  }) => {
    const headers = bearer(accounts.employee);
    const types: { id: string; code: string }[] = await (
      await request.get('/api/v1/leaves/types', { headers })
    ).json();
    const type = types.find((item) => item.code === 'QA_ANNUAL');
    expect(type).toBeTruthy();
    const response = await request.post('/api/v1/leaves/preview', {
      headers,
      data: { leaveTypeId: type!.id, startDate, endDate, duration },
    });
    expect(response.status()).toBe(expectedStatus);
    if (expectedStatus === 201)
      expect((await response.json()).requestedDays).toBe(days);
  });
}

test('LEAVE-008 employee cannot approve requests', async ({
  request,
  accounts,
}) => {
  expect(
    (
      await request.post(`/api/v1/leaves/${randomUUID()}/approve`, {
        headers: bearer(accounts.employee),
        data: {},
      })
    ).status(),
  ).toBe(403);
});

test('FAULT-004 lifecycle enforces transitions and required notes', async ({
  request,
  accounts,
}) => {
  const headers = bearer(accounts.admin);
  const created = await request.post('/api/v1/faults', {
    headers,
    data: {
      faultNumber: `QA-${randomUUID()}`,
      title: 'QA lifecycle',
      description: 'Synthetic lifecycle regression',
    },
  });
  expect(created.status()).toBe(201);
  const fault = await created.json();
  const path = `/api/v1/faults/${fault.id}/status`;
  expect(
    (
      await request.patch(path, { headers, data: { status: 'RESOLVED' } })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.patch(path, {
        headers,
        data: { status: 'RESOLVED', notes: 'Invalid direct transition' },
      })
    ).status(),
  ).toBe(409);
  for (const status of [
    'IN_PROGRESS',
    'ON_HOLD',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED',
  ]) {
    const result = await request.patch(path, {
      headers,
      data: { status, notes: 'QA transition evidence' },
    });
    expect(result.status()).toBe(200);
    expect((await result.json()).status).toBe(status);
  }
  expect(
    (
      await request.patch(path, { headers, data: { status: 'IN_PROGRESS' } })
    ).status(),
  ).toBe(409);
});

test('ATT-010 rejects malformed punch before business mutation', async ({
  request,
  accounts,
}) => {
  const response = await request.post('/api/v1/attendance/punch', {
    headers: bearer(accounts.employee),
    data: {
      latitude: 91,
      longitude: 181,
      accuracy: -1,
      timestamp: 'invalid',
      deviceId: 'synthetic',
      signature: '',
    },
  });
  expect(response.status()).toBe(400);
});

test('ATT-011 unbound handset cannot punch', async ({ request, accounts }) => {
  const response = await request.post('/api/v1/attendance/punch', {
    headers: bearer(accounts.employee),
    data: {
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 5,
      timestamp: new Date().toISOString(),
      deviceId: randomUUID(),
      signature: 'invalid',
    },
  });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.errorCode).toBe('DEVICE-007');
});
