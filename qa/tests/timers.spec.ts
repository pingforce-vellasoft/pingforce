import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';
import { LEAVE_DAYS } from './leave-days';

/**
 * Timer jobs, run "as of" a later time through the QA-only job trigger
 * (apps/api/src/qa-jobs; loaded only when PINGFORCE_ENV=qa), plus soft
 * delete and employee details.
 */

const tag = () => randomUUID().slice(0, 8);
const hoursFromNow = (h: number) =>
  new Date(Date.now() + h * 3_600_000).toISOString();

const runJob = (
  request: APIRequestContext,
  admin: Session,
  job: string,
  asOf: string,
) =>
  request.post(`/api/v1/qa/jobs/${job}`, {
    headers: bearer(admin),
    data: { asOf },
  });

test('P4-FLT-02 a fault past its SLA is flagged and escalated', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  // One SLA policy per priority per tenant; reuse it if a rerun made it.
  const policy = await request.post('/api/v1/sla-policies', {
    headers: admin,
    data: { priority: 'HIGH', resolveInHours: 2 },
  });
  expect([201, 409], await policy.text()).toContain(policy.status());
  const created = await request.post('/api/v1/faults', {
    headers: admin,
    data: {
      faultNumber: `QA-${randomUUID()}`,
      title: 'QA SLA',
      description: 'Synthetic SLA breach',
      priority: 'HIGH',
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const fault = (await created.json()) as {
    id: string;
    slaDeadline: string | null;
  };
  expect(fault.slaDeadline, 'deadline set from the policy').toBeTruthy();

  // Before the deadline nothing happens; after it, the fault is escalated.
  expect(
    (await runJob(request, accounts.admin, 'fault-sla', hoursFromNow(1))).ok(),
  ).toBeTruthy();
  const early = await (
    await request.get(`/api/v1/faults/${fault.id}`, { headers: admin })
  ).json();
  expect(early.isEscalated ?? false).toBe(false);
  const late = await runJob(
    request,
    accounts.admin,
    'fault-sla',
    hoursFromNow(3),
  );
  expect(late.ok(), await late.text()).toBeTruthy();
  const breached = await (
    await request.get(`/api/v1/faults/${fault.id}`, { headers: admin })
  ).json();
  expect(breached.isEscalated).toBe(true);
  expect(breached.escalationLevel).toBeGreaterThanOrEqual(1);
  // Field staff cannot run jobs.
  expect(
    (
      await runJob(request, accounts.employee, 'fault-sla', hoursFromNow(3))
    ).status(),
  ).toBe(403);
});

test('P2-WF-03 an approval past its SLA is escalated', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const staff = bearer(accounts.employee);
  const adminId = (
    await (await request.get('/api/v1/auth/me', { headers: admin })).json()
  ).userId as string;
  const workflow = await request.post('/api/v1/workflows', {
    headers: admin,
    data: {
      code: `QA_SLA_${tag().toUpperCase()}`,
      name: 'QA SLA workflow',
      module: 'LEAVES',
      entityName: 'leave_request',
      active: true,
      stages: [
        {
          stageNumber: 1,
          stageName: 'Admin',
          approverUserId: adminId,
          slaHours: 1,
        },
      ],
    },
  });
  expect(workflow.status(), await workflow.text()).toBe(201);
  const workflowId = (await workflow.json()).id as string;
  let leaveId = '';
  try {
    const types = (await (
      await request.get('/api/v1/leaves/types', { headers: staff })
    ).json()) as { id: string; code: string }[];
    const leave = await request.post('/api/v1/leaves/request', {
      headers: staff,
      data: {
        leaveTypeId: types.find((t) => t.code === 'QA_ANNUAL')!.id,
        startDate: LEAVE_DAYS[47],
        endDate: LEAVE_DAYS[47],
        reason: 'QA SLA',
      },
    });
    expect(leave.status(), await leave.text()).toBe(201);
    leaveId = (await leave.json()).id as string;
    const swept = await runJob(
      request,
      accounts.admin,
      'workflow-sla',
      hoursFromNow(2),
    );
    expect(swept.ok(), await swept.text()).toBeTruthy();
    await expect
      .poll(
        async () =>
          (
            await request.get('/api/v1/audit?action=WORKFLOW_ESCALATED', {
              headers: admin,
            })
          ).text(),
        { timeout: 10_000, intervals: [1_000] },
      )
      .toContain(leaveId);
  } finally {
    await request.post(`/api/v1/workflows/${workflowId}/deactivate`, {
      headers: admin,
    });
    if (leaveId)
      await request.post(`/api/v1/leaves/${leaveId}/withdraw`, {
        headers: staff,
      });
  }
});

test('P1-DB-04 deleted records vanish from every list and detail', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const make = async (path: string, data: Record<string, unknown>) => {
    const created = await request.post(`/api/v1/${path}`, {
      headers: admin,
      data,
    });
    expect(created.status(), await created.text()).toBe(201);
    return (await created.json()).id as string;
  };
  const records = [
    [
      'customers',
      await make('customers', {
        customerCode: `QA-SD-${tag()}`,
        legalName: 'QA soft',
      }),
    ],
    [
      'leads',
      await make('leads', { leadNumber: `QA-SD-${tag()}`, firstName: 'Soft' }),
    ],
    [
      'employees',
      await make('employees', {
        employeeCode: `QA-SD-${tag()}`,
        firstName: 'Soft',
        lastName: 'Delete',
      }),
    ],
    [
      'visits',
      await make('visits', {
        purpose: `QA soft ${tag()}`,
        plannedStartAt: hoursFromNow(2),
      }),
    ],
  ] as const;
  for (const [path, id] of records) {
    const removed = await request.delete(`/api/v1/${path}/${id}`, {
      headers: admin,
    });
    expect(removed.ok(), `${path}: ${await removed.text()}`).toBeTruthy();
    expect(
      (await request.get(`/api/v1/${path}/${id}`, { headers: admin })).status(),
      path,
    ).toBe(404);
    const list = await request.get(
      `/api/v1/${path}${path === 'employees' ? '?take=100' : ''}`,
      {
        headers: admin,
      },
    );
    expect(await list.text(), `${path} list`).not.toContain(id);
  }
});

test('P2-EMP-02 employee details carry profile, org links and balance', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const rows = (await (
    await request.get('/api/v1/employees?take=100', { headers: admin })
  ).json()) as { id: string; employeeCode: string }[];
  const id = rows.find((r) => r.employeeCode === 'QA-EMPLOYEE')!.id;
  const detail = await request.get(`/api/v1/employees/${id}`, {
    headers: admin,
  });
  expect(detail.status(), await detail.text()).toBe(200);
  const body = await detail.json();
  expect(body).toMatchObject({ employeeCode: 'QA-EMPLOYEE', firstName: 'QA' });
  for (const key of ['department', 'designation', 'branch', 'reportingManager'])
    expect(body, key).toHaveProperty(key);
  const balance = await request.get(`/api/v1/leaves/balance/${id}`, {
    headers: admin,
  });
  expect(balance.status(), await balance.text()).toBe(200);
  expect(await balance.text()).toContain('availableDays');
});
