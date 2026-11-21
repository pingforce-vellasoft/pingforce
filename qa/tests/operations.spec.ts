import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, credentials, type Session } from './fixtures';
import { LEAVE_DAYS, MY_BALANCE_URL } from './leave-days';
import { senderOfLatestTo } from './mailbox';

/**
 * Day-to-day operations: tenant email provider, push failures, duplicate
 * actions, admin filters, tracking gaps, assigning visits and long lists.
 */

const tag = () => randomUUID().slice(0, 8);

async function annualTypeId(
  request: APIRequestContext,
  employee: Session,
): Promise<string> {
  const types = (await (
    await request.get('/api/v1/leaves/types', { headers: bearer(employee) })
  ).json()) as { id: string; code: string }[];
  return types.find((t) => t.code === 'QA_ANNUAL')!.id;
}

async function availableDays(
  request: APIRequestContext,
  employee: Session,
  typeId: string,
): Promise<number> {
  const rows = (await (
    await request.get(MY_BALANCE_URL, { headers: bearer(employee) })
  ).json()) as { leaveTypeId: string; availableDays: number }[];
  return rows.find((r) => r.leaveTypeId === typeId)!.availableDays;
}

async function employeeIdByCode(
  request: APIRequestContext,
  admin: Session,
  code: string,
): Promise<string> {
  const rows = (await (
    await request.get('/api/v1/employees?take=100', { headers: bearer(admin) })
  ).json()) as { id: string; employeeCode: string }[];
  return rows.find((r) => r.employeeCode === code)!.id;
}

test('P2-NOT-02 a tenant email provider sends that tenant mail', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const fromAddress = `helpdesk-${tag()}@qa-alpha.test`;
  const config = await request.put('/api/v1/notifications/email-config', {
    headers: admin,
    data: { host: 'mailpit', port: 1025, secure: false, fromAddress },
  });
  expect(config.ok(), await config.text()).toBeTruthy();
  try {
    const since = new Date();
    const otp = await request.post('/api/v1/auth/otp/request', {
      headers: bearer(accounts.employee),
      data: { purpose: 'EMAIL_VERIFICATION' },
    });
    expect(otp.status(), await otp.text()).toBe(200);
    const sender = await senderOfLatestTo(
      request,
      credentials('employee').email,
      since,
    );
    expect(sender, 'sent through the tenant provider').toBe(fromAddress);
    // Field staff cannot read or change the provider.
    expect(
      (
        await request.get('/api/v1/notifications/email-config', {
          headers: bearer(accounts.employee),
        })
      ).status(),
    ).toBe(403);
  } finally {
    await request.delete('/api/v1/notifications/email-config', {
      headers: admin,
    });
  }
});

test('P2-NOT-04/P3-LV-11 a dead push token never blocks the decision', async ({
  request,
  accounts,
}) => {
  const staff = bearer(accounts.employee);
  const deviceId = `qa-push-${tag()}`;
  const token = await request.post('/api/v1/notifications/device-tokens', {
    headers: staff,
    data: { deviceId, fcmToken: `stale-${tag()}`, platform: 'ANDROID' },
  });
  expect(token.ok(), await token.text()).toBeTruthy();
  const typeId = await annualTypeId(request, accounts.employee);
  const leave = await request.post('/api/v1/leaves/request', {
    headers: staff,
    data: {
      leaveTypeId: typeId,
      startDate: LEAVE_DAYS[44],
      endDate: LEAVE_DAYS[44],
      reason: 'QA push',
    },
  });
  expect(leave.status(), await leave.text()).toBe(201);
  try {
    const decided = await request.post(
      `/api/v1/leaves/${(await leave.json()).id}/reject`,
      { headers: bearer(accounts.admin), data: { reason: 'QA push failure' } },
    );
    expect(decided.ok(), await decided.text()).toBeTruthy();
    expect((await decided.json()).status).toBe('REJECTED');
  } finally {
    await request.delete(`/api/v1/notifications/device-tokens/${deviceId}`, {
      headers: staff,
    });
  }
});

test('P3-LV-12 a repeated withdraw refunds the day once', async ({
  request,
  accounts,
}) => {
  const staff = bearer(accounts.employee);
  const typeId = await annualTypeId(request, accounts.employee);
  const before = await availableDays(request, accounts.employee, typeId);
  const leave = await request.post('/api/v1/leaves/request', {
    headers: staff,
    data: {
      leaveTypeId: typeId,
      startDate: LEAVE_DAYS[45],
      endDate: LEAVE_DAYS[45],
      reason: 'QA double withdraw',
    },
  });
  expect(leave.status(), await leave.text()).toBe(201);
  const id = (await leave.json()).id as string;
  const results = await Promise.all(
    [0, 1, 2].map(() =>
      request.post(`/api/v1/leaves/${id}/withdraw`, { headers: staff }),
    ),
  );
  for (const r of results) expect(r.status(), await r.text()).toBeLessThan(500);
  expect(results.some((r) => r.ok())).toBeTruthy();
  expect(await availableDays(request, accounts.employee, typeId)).toBe(before);
});

test('P3-LV-10 the admin queue lists pending requests; staff cannot see it', async ({
  request,
  accounts,
}) => {
  const staff = bearer(accounts.employee);
  const typeId = await annualTypeId(request, accounts.employee);
  const leave = await request.post('/api/v1/leaves/request', {
    headers: staff,
    data: {
      leaveTypeId: typeId,
      startDate: LEAVE_DAYS[46],
      endDate: LEAVE_DAYS[46],
      reason: 'QA admin queue',
    },
  });
  const id = (await leave.json()).id as string;
  try {
    const queue = await request.get('/api/v1/leaves/pending?status=PENDING', {
      headers: bearer(accounts.admin),
    });
    expect(queue.status(), await queue.text()).toBe(200);
    expect(await queue.text()).toContain(id);
    const foreign = await request.get('/api/v1/leaves/pending', {
      headers: bearer(accounts.other),
    });
    expect(await foreign.text()).not.toContain(id);
    expect(
      (
        await request.get('/api/v1/leaves/pending', { headers: staff })
      ).status(),
    ).toBe(403);
  } finally {
    await request.post(`/api/v1/leaves/${id}/withdraw`, { headers: staff });
  }
});

test('P3-ATT-17 admin attendance logs filter by employee and date', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const employeeId = await employeeIdByCode(
    request,
    accounts.admin,
    'QA-EMPLOYEE',
  );
  const filtered = await request.get(
    `/api/v1/attendance/daily-logs?employeeId=${employeeId}`,
    { headers: admin },
  );
  expect(filtered.status(), await filtered.text()).toBe(200);
  const rows = ((await filtered.json()).data ?? []) as { employeeId: string }[];
  expect(rows.every((r) => r.employeeId === employeeId)).toBeTruthy();
  // A window in the far past holds nothing.
  const empty = await request.get(
    '/api/v1/attendance/daily-logs?from=2000-01-01&to=2000-01-31',
    { headers: admin },
  );
  expect(empty.status(), await empty.text()).toBe(200);
  expect((await empty.json()).data).toEqual([]);
  // Invalid filters are a 400, not a 500.
  const bad = await request.get(
    '/api/v1/attendance/daily-logs?from=not-a-date',
    {
      headers: admin,
    },
  );
  expect(bad.status(), await bad.text()).toBe(400);
});

test('P3-ATT-19 tracking gaps: idempotent open, own session only, close', async ({
  request,
  accounts,
}) => {
  const staff = bearer(accounts.employee);
  const open = (data: Record<string, unknown>) =>
    request.post('/api/v1/attendance/tracking-gap/open', {
      headers: staff,
      data: { reason: 'LOCATION_DISABLED', ...data },
    });
  expect(
    (await open({ attendanceSessionId: randomUUID() })).status(),
    'foreign session',
  ).toBe(404);
  expect(
    (
      await open({ startedAt: new Date(Date.now() + 3_600_000).toISOString() })
    ).status(),
    'future start',
  ).toBe(400);
  const first = await open({});
  expect(first.status(), await first.text()).toBe(201);
  const again = await open({});
  expect((await again.json()).id, 'same open gap').toBe(
    (await first.json()).id,
  );
  const closed = await request.post('/api/v1/attendance/tracking-gap/close', {
    headers: staff,
  });
  expect(closed.ok(), await closed.text()).toBeTruthy();
  const body = (await closed.json()) as {
    endedAt: string;
    durationMinutes: number;
  };
  expect(body.endedAt).toBeTruthy();
  expect(body.durationMinutes).toBeGreaterThanOrEqual(0);
  // The no-grant role cannot report gaps.
  expect(
    (
      await request.post('/api/v1/attendance/tracking-gap/open', {
        headers: bearer(accounts.restricted),
        data: { reason: 'LOCATION_DISABLED' },
      })
    ).status(),
  ).toBe(403);
});

test('P3-ATT-21/22 assign an open visit, or plan a new assigned one', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const employeeId = await employeeIdByCode(
    request,
    accounts.admin,
    'QA-EMPLOYEE',
  );
  const planned = await request.post('/api/v1/visits', {
    headers: admin,
    data: {
      purpose: `QA open ${tag()}`,
      plannedStartAt: new Date(Date.now() + 3_600_000).toISOString(),
    },
  });
  const plannedId = (await planned.json()).id as string;
  const ids = [plannedId];
  try {
    // P3-ATT-21: the open (PLANNED) list offers it; assigning it works.
    const open = await request.get('/api/v1/visits?status=PLANNED', {
      headers: admin,
    });
    expect(await open.text()).toContain(plannedId);
    const assigned = await request.post(`/api/v1/visits/${plannedId}/assign`, {
      headers: admin,
      data: { employeeId },
    });
    expect(assigned.ok(), await assigned.text()).toBeTruthy();
    expect(
      await (
        await request.get('/api/v1/visits?status=PLANNED', { headers: admin })
      ).text(),
    ).not.toContain(plannedId);
    // P3-ATT-22: planning a new visit for the employee creates it assigned.
    const fresh = await request.post('/api/v1/visits', {
      headers: admin,
      data: {
        purpose: `QA planned for employee ${tag()}`,
        plannedStartAt: new Date(Date.now() + 7_200_000).toISOString(),
        employeeId,
      },
    });
    expect(fresh.status(), await fresh.text()).toBe(201);
    const freshVisit = (await fresh.json()) as { id: string; status: string };
    ids.push(freshVisit.id);
    expect(freshVisit.status).toBe('ASSIGNED');
  } finally {
    for (const id of ids)
      await request.post(`/api/v1/visits/${id}/cancel`, {
        headers: admin,
        data: { notes: 'QA clean up' },
      });
  }
});

test('P4-CUS-08 a tenant with 200+ customers gets the full list', async ({
  request,
  accounts,
}) => {
  // qa/seed.ts writes 205 QA-BULK- customers into QA_BETA directly; creating
  // them through the API here tripped the general rate limit for every
  // later test that creates a customer.
  const list = await request.get('/api/v1/customers', {
    headers: bearer(accounts.other),
  });
  expect(list.status(), await list.text()).toBe(200);
  const bulk = ((await list.json()) as { customerCode: string }[]).filter((c) =>
    c.customerCode.startsWith('QA-BULK-'),
  );
  expect(bulk.length).toBe(205);
});
