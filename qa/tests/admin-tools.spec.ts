import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';

/** Admin tools: stage management, connection edits, offline sync refusals. */

const tag = () => randomUUID().slice(0, 8);

async function userId(
  request: APIRequestContext,
  session: Session,
): Promise<string> {
  return (
    await (
      await request.get('/api/v1/auth/me', { headers: bearer(session) })
    ).json()
  ).userId as string;
}

test('P4-LD-12 stages can be added, renamed and reordered', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const base = '/api/v1/leads/stages';
  const added = await request.post(base, {
    headers: admin,
    data: { name: `QA manage ${tag()}` },
  });
  expect(added.status(), await added.text()).toBe(201);
  const id = (await added.json()).id as string;
  try {
    const newName = `QA renamed ${tag()}`;
    const renamed = await request.patch(`${base}/${id}`, {
      headers: admin,
      data: { name: `  ${newName}  ` },
    });
    expect(renamed.ok(), await renamed.text()).toBeTruthy();
    expect((await renamed.json()).name).toBe(newName);

    const stages = (await (
      await request.get(base, { headers: admin })
    ).json()) as {
      id: string;
    }[];
    // Move the new stage to the front.
    const order = [id, ...stages.map((s) => s.id).filter((s) => s !== id)];
    const reordered = await request.put(`${base}/order`, {
      headers: admin,
      data: { stageIds: order },
    });
    expect(reordered.ok(), await reordered.text()).toBeTruthy();
    const after = (await (
      await request.get(base, { headers: admin })
    ).json()) as {
      id: string;
    }[];
    expect(after[0].id).toBe(id);
    // Restore the original order for other tests.
    await request.put(`${base}/order`, {
      headers: admin,
      data: { stageIds: stages.map((s) => s.id) },
    });
    // Another tenant cannot rename it.
    expect(
      (
        await request.patch(`${base}/${id}`, {
          headers: bearer(accounts.other),
          data: { name: 'hijack' },
        })
      ).status(),
    ).toBe(404);
  } finally {
    await request.delete(`${base}/${id}`, { headers: admin });
  }
});

test('P4-MAP-10 edit a connection, assign an employee, clear the customer', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const olte = await request.post('/api/v1/network/oltes', {
    headers: admin,
    data: { code: `QA-OLT-E-${tag()}`, name: 'QA edit OLTE', totalPorts: 0 },
  });
  expect(olte.status(), await olte.text()).toBe(201);
  const customer = await request.post('/api/v1/customers', {
    headers: admin,
    data: { customerCode: `QA-MC-${tag()}`, legalName: 'QA map customer' },
  });
  expect(customer.status(), await customer.text()).toBe(201);
  const created = await request.post('/api/v1/network/connections', {
    headers: admin,
    data: {
      connectionCode: `QA-CE-${tag()}`,
      olteId: (await olte.json()).id,
      customerId: (await customer.json()).id,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = (await created.json()).id as string;
  const url = `/api/v1/network/connections/${id}`;

  const edited = await request.patch(url, {
    headers: admin,
    data: {
      remarks: 'QA edited',
      cableType: 'FIBER',
      assignedEmployeeId: await userId(request, accounts.employee),
    },
  });
  expect(edited.ok(), await edited.text()).toBeTruthy();
  const cleared = await request.patch(url, {
    headers: admin,
    data: { customerId: null },
  });
  expect(cleared.ok(), await cleared.text()).toBeTruthy();
  const detail = (await (
    await request.get(url, { headers: admin })
  ).json()) as {
    remarks: string;
    assignedEmployeeId: string;
    customerId: string | null;
  };
  expect(detail.remarks).toBe('QA edited');
  expect(detail.assignedEmployeeId).toBeTruthy();
  expect(detail.customerId ?? null).toBeNull();
  // An assignee from another tenant is refused.
  const foreign = await request.patch(url, {
    headers: admin,
    data: { assignedEmployeeId: await userId(request, accounts.other) },
  });
  expect(foreign.status(), await foreign.text()).toBe(400);
  // History records the edits.
  const history = await request.get(`${url}/history`, { headers: admin });
  expect(history.status(), await history.text()).toBe(200);
});

test('X-SYNC-03 a refused offline item fails alone; the rest of the batch applies', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const staff = bearer(accounts.employee);
  const mineRes = await request.post('/api/v1/faults', {
    headers: admin,
    data: {
      faultNumber: `QA-${randomUUID()}`,
      title: 'QA sync own',
      description: 'x',
    },
  });
  const mine = (await mineRes.json()).id as string;
  await request.post(`/api/v1/faults/${mine}/assign`, {
    headers: admin,
    data: { assignedToId: await userId(request, accounts.employee) },
  });
  const notMine = (
    await (
      await request.post('/api/v1/faults', {
        headers: admin,
        data: {
          faultNumber: `QA-${randomUUID()}`,
          title: 'QA sync other',
          description: 'x',
        },
      })
    ).json()
  ).id as string;
  const now = new Date().toISOString();
  const sync = await request.post('/api/v1/faults/sync', {
    headers: staff,
    data: {
      actions: [
        {
          clientRef: `qa-${tag()}`,
          action: 'UPDATE_STATUS',
          timestamp: now,
          faultId: notMine,
          status: 'IN_PROGRESS',
          notes: 'QA',
        },
        {
          clientRef: `qa-${tag()}`,
          action: 'UPDATE_STATUS',
          timestamp: now,
          faultId: mine,
          status: 'IN_PROGRESS',
          notes: 'QA',
        },
      ],
    },
  });
  expect(sync.ok(), await sync.text()).toBeTruthy();
  const { results } = (await sync.json()) as {
    results: { status: string; error?: string }[];
  };
  expect(results.map((r) => r.status)).toEqual(['FAILED', 'APPLIED']);
  expect(results[0].error, 'reason given').toBeTruthy();
  const detail = await request.get(`/api/v1/faults/${mine}`, {
    headers: admin,
  });
  expect((await detail.json()).status).toBe('IN_PROGRESS');
  const untouched = await request.get(`/api/v1/faults/${notMine}`, {
    headers: admin,
  });
  expect((await untouched.json()).status).toBe('OPEN');
});
