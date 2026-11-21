import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';

/**
 * Phase 4 through the API: fault lifecycle and attempts, customers, leads
 * and stages, and the connection map. Mobile/offline cases stay on device.
 */

const tag = () => randomUUID().slice(0, 8);
const refused = (status: number) => status >= 400 && status < 500;

async function userId(
  request: APIRequestContext,
  session: Session,
): Promise<string> {
  const me = await request.get('/api/v1/auth/me', { headers: bearer(session) });
  expect(me.status(), await me.text()).toBe(200);
  return (await me.json()).userId as string;
}

async function newFault(
  request: APIRequestContext,
  admin: Session,
  assignedToId?: string,
): Promise<string> {
  const created = await request.post('/api/v1/faults', {
    headers: bearer(admin),
    data: {
      faultNumber: `QA-${randomUUID()}`,
      title: 'QA phase 4',
      description: 'Synthetic phase 4 regression',
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const id = (await created.json()).id as string;
  if (assignedToId) {
    const assigned = await request.post(`/api/v1/faults/${id}/assign`, {
      headers: bearer(admin),
      data: { assignedToId, notes: 'QA assign' },
    });
    expect(assigned.ok(), await assigned.text()).toBeTruthy();
  }
  return id;
}

const setStatus = (
  request: APIRequestContext,
  session: Session,
  id: string,
  status: string,
) =>
  request.patch(`/api/v1/faults/${id}/status`, {
    headers: bearer(session),
    data: { status, notes: `QA move to ${status}` },
  });

test('P4-FLT-01 fault lifecycle: only valid moves, timeline records each', async ({
  request,
  accounts,
}) => {
  const { admin, employee } = accounts;
  const id = await newFault(request, admin, await userId(request, employee));
  for (const status of ['IN_PROGRESS', 'ON_HOLD', 'IN_PROGRESS', 'RESOLVED']) {
    const moved = await setStatus(request, admin, id, status);
    expect(moved.ok(), `${status}: ${await moved.text()}`).toBeTruthy();
  }
  // ON_HOLD is not reachable from RESOLVED; reopen is.
  expect((await setStatus(request, admin, id, 'ON_HOLD')).status()).toBe(409);
  expect((await setStatus(request, admin, id, 'REOPENED')).ok()).toBeTruthy();
  expect(
    (await setStatus(request, admin, id, 'IN_PROGRESS')).ok(),
  ).toBeTruthy();
  expect((await setStatus(request, admin, id, 'RESOLVED')).ok()).toBeTruthy();
  expect((await setStatus(request, admin, id, 'CLOSED')).ok()).toBeTruthy();
  // CLOSED is terminal.
  for (const status of ['REOPENED', 'IN_PROGRESS'])
    expect((await setStatus(request, admin, id, status)).status(), status).toBe(
      409,
    );
  const detail = await request.get(`/api/v1/faults/${id}`, {
    headers: bearer(admin),
  });
  const text = await detail.text();
  for (const status of ['ON_HOLD', 'REOPENED', 'CLOSED'])
    expect(text).toContain(status);
});

test('P4-ATT-01..07/09/14 attempts: numbered, validated, scoped, idempotent', async ({
  request,
  accounts,
}) => {
  const { admin, employee, restricted } = accounts;
  const employeeUserId = await userId(request, employee);
  const id = await newFault(request, admin, employeeUserId);
  expect(
    (await setStatus(request, admin, id, 'IN_PROGRESS')).ok(),
  ).toBeTruthy();
  const base = `/api/v1/faults/${id}/attempts`;
  const at = (minutesAgo: number) =>
    new Date(Date.now() - minutesAgo * 60_000).toISOString();
  const attempt = (session: Session, data: Record<string, unknown>) =>
    request.post(base, {
      headers: bearer(session),
      data: {
        attemptType: 'INITIAL_VISIT',
        outcome: 'REVISIT_REQUIRED',
        startedAt: at(60),
        endedAt: at(30),
        workNotes: 'QA attempt',
        ...data,
      },
    });

  // P4-ATT-01/02: three attempts are numbered 1, 2, 3.
  const ref = `qa-attempt-${tag()}`;
  const first = await attempt(employee, { clientRef: ref });
  expect(first.status(), await first.text()).toBe(201);
  // P4-ATT-14: a retried save with the same clientRef records nothing new.
  const retried = await attempt(employee, { clientRef: ref });
  expect(retried.ok(), await retried.text()).toBeTruthy();
  for (let i = 0; i < 2; i++)
    expect((await attempt(employee, {})).status()).toBe(201);
  const list = (await (
    await request.get(base, { headers: bearer(employee) })
  ).json()) as
    | { attemptNumber: number }[]
    | { items: { attemptNumber: number }[] };
  const rows = Array.isArray(list) ? list : list.items;
  expect(rows.map((r) => r.attemptNumber).sort()).toEqual([1, 2, 3]);

  // P4-ATT-03/04/05: validation.
  expect(
    (await attempt(employee, { outcome: 'RESOLVED', workNotes: '' })).status(),
    'resolved without notes',
  ).toBe(400);
  expect(
    (await attempt(employee, { startedAt: at(10), endedAt: at(20) })).status(),
    'ends before it starts',
  ).toBe(400);
  expect(
    (
      await attempt(employee, { startedAt: at(-60), endedAt: undefined })
    ).status(),
    'starts in the future',
  ).toBe(400);

  // P4-ATT-07: a RESOLVED outcome does not change the fault status.
  const resolvedAttempt = await attempt(employee, {
    outcome: 'RESOLVED',
    workNotes: 'QA fixed it',
  });
  expect(resolvedAttempt.status(), await resolvedAttempt.text()).toBe(201);
  const detail = await request.get(`/api/v1/faults/${id}`, {
    headers: bearer(admin),
  });
  expect((await detail.json()).status).toBe('IN_PROGRESS');

  // P4-ATT-09: outside the caller's scope.
  const unassigned = await newFault(request, admin);
  const foreign = await request.post(`/api/v1/faults/${unassigned}/attempts`, {
    headers: bearer(employee),
    data: {
      attemptType: 'INITIAL_VISIT',
      outcome: 'REVISIT_REQUIRED',
      startedAt: at(5),
    },
  });
  expect(foreign.status(), 'not my fault').toBe(404);
  const noGrant = await request.post(base, {
    headers: bearer(restricted),
    data: {
      attemptType: 'INITIAL_VISIT',
      outcome: 'REVISIT_REQUIRED',
      startedAt: at(5),
    },
  });
  expect(noGrant.status()).toBe(403);

  // P4-ATT-06: no attempts on a resolved fault.
  expect((await setStatus(request, admin, id, 'RESOLVED')).ok()).toBeTruthy();
  const late = await attempt(employee, {});
  expect(
    refused(late.status()),
    `attempt on resolved ${late.status()}`,
  ).toBeTruthy();
});

test('P4-CUS-01..04 customers: duplicates, foreign links, loops, delete', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const beta = bearer(accounts.other);
  const create = (
    headers: Record<string, string>,
    data: Record<string, unknown>,
  ) => request.post('/api/v1/customers', { headers, data });
  const code = `QA-CUS-${tag()}`;
  const a = await create(admin, {
    customerCode: code,
    legalName: 'QA Customer A',
  });
  expect(a.status(), await a.text()).toBe(201);
  const aId = (await a.json()).id as string;

  // P4-CUS-01: edit, and a duplicate code is refused.
  const edited = await request.patch(`/api/v1/customers/${aId}`, {
    headers: admin,
    data: { displayName: 'QA Customer A edited' },
  });
  expect(edited.ok(), await edited.text()).toBeTruthy();
  const duplicate = await create(admin, {
    customerCode: code,
    legalName: 'QA dup',
  });
  expect([400, 409]).toContain(duplicate.status());

  // P4-CUS-02: links to another tenant's rows are refused.
  const betaCustomer = await create(beta, {
    customerCode: `QA-BETA-${tag()}`,
    legalName: 'QA beta customer',
  });
  const betaId = (await betaCustomer.json()).id as string;
  const betaUser = await userId(request, accounts.other);
  for (const [field, value] of [
    ['parentCustomerId', betaId],
    ['accountManagerId', betaUser],
    ['companyId', randomUUID()],
  ])
    expect(
      (
        await create(admin, {
          customerCode: `QA-L-${tag()}`,
          legalName: 'QA foreign link',
          [field]: value,
        })
      ).status(),
      field,
    ).toBe(400);

  // P4-CUS-03: own parent, and A -> B -> A.
  expect(
    (
      await request.patch(`/api/v1/customers/${aId}`, {
        headers: admin,
        data: { parentCustomerId: aId },
      })
    ).status(),
    'own parent',
  ).toBe(400);
  const b = await create(admin, {
    customerCode: `QA-CUS-${tag()}`,
    legalName: 'QA Customer B',
    parentCustomerId: aId,
  });
  expect(b.status(), await b.text()).toBe(201);
  const bId = (await b.json()).id as string;
  expect(
    (
      await request.patch(`/api/v1/customers/${aId}`, {
        headers: admin,
        data: { parentCustomerId: bId },
      })
    ).status(),
    'loop',
  ).toBe(400);

  // P4-CUS-04: soft delete leaves the lists.
  const removed = await request.delete(`/api/v1/customers/${bId}`, {
    headers: admin,
  });
  expect(removed.ok(), await removed.text()).toBeTruthy();
  expect(
    (
      await request.get(`/api/v1/customers/${bId}`, { headers: admin })
    ).status(),
  ).toBe(404);
  expect(
    await (await request.get('/api/v1/customers', { headers: admin })).text(),
  ).not.toContain(bId);
});

test('P4-LD-03/04/13/14 leads: foreign refs, convert once, stage rules', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const beta = bearer(accounts.other);
  const stages = (await (
    await request.get('/api/v1/leads/stages', { headers: admin })
  ).json()) as { id: string; name: string }[];
  expect(stages.length).toBeGreaterThan(1);
  const betaStages = (await (
    await request.get('/api/v1/leads/stages', { headers: beta })
  ).json()) as { id: string }[];

  // P4-LD-03: another tenant's stage id is refused.
  const foreign = await request.post('/api/v1/leads', {
    headers: admin,
    data: {
      leadNumber: `QA-L-${tag()}`,
      firstName: 'Foreign',
      pipelineStageId: betaStages[0].id,
    },
  });
  expect(foreign.status(), await foreign.text()).toBe(400);

  // P4-LD-04: convert once.
  const lead = await request.post('/api/v1/leads', {
    headers: admin,
    data: {
      leadNumber: `QA-L-${tag()}`,
      firstName: 'Convert',
      lastName: 'Me',
      email: `lead-${tag()}@qa.pingforce.test`,
      pipelineStageId: stages[0].id,
    },
  });
  expect(lead.status(), await lead.text()).toBe(201);
  const leadId = (await lead.json()).id as string;
  const converted = await request.post(`/api/v1/leads/${leadId}/convert`, {
    headers: admin,
    data: { legalName: 'QA Converted Ltd' },
  });
  expect(converted.ok(), await converted.text()).toBeTruthy();
  const again = await request.post(`/api/v1/leads/${leadId}/convert`, {
    headers: admin,
    data: { legalName: 'QA Converted Again' },
  });
  expect(again.status(), 'second convert').toBe(409);

  // P4-LD-13: a stage name differing only in case is refused.
  const dupName = await request.post('/api/v1/leads/stages', {
    headers: admin,
    data: { name: stages[0].name.toUpperCase() },
  });
  expect(dupName.status(), await dupName.text()).toBe(409);

  // P4-LD-14: a stage holding leads cannot be removed.
  const holding = await request.post('/api/v1/leads/stages', {
    headers: admin,
    data: { name: `QA stage ${tag()}` },
  });
  expect(holding.status(), await holding.text()).toBe(201);
  const stageId = (await holding.json()).id as string;
  const parked = await request.post('/api/v1/leads', {
    headers: admin,
    data: {
      leadNumber: `QA-L-${tag()}`,
      firstName: 'Parked',
      pipelineStageId: stageId,
    },
  });
  expect(parked.status(), await parked.text()).toBe(201);
  const blocked = await request.delete(`/api/v1/leads/stages/${stageId}`, {
    headers: admin,
  });
  expect(blocked.status(), await blocked.text()).toBe(409);
  // A reorder must list every stage exactly once.
  const partial = await request.put('/api/v1/leads/stages/order', {
    headers: admin,
    data: { stageIds: [stageId] },
  });
  expect(partial.status()).toBe(400);
  // Move the lead out, then the empty stage can go.
  const moved = await request.patch(
    `/api/v1/leads/${(await parked.json()).id}/stage`,
    {
      headers: admin,
      data: { pipelineStageId: stages[0].id },
    },
  );
  expect(moved.ok(), await moved.text()).toBeTruthy();
  const removed = await request.delete(`/api/v1/leads/stages/${stageId}`, {
    headers: admin,
  });
  expect(removed.ok(), await removed.text()).toBeTruthy();
  // Field staff have no lead permissions.
  expect(
    (
      await request.get('/api/v1/leads', { headers: bearer(accounts.employee) })
    ).status(),
  ).toBe(403);
});

test('P4-MAP-01/06/08..16 connection map: ports, moves, split, merge, field scope', async ({
  request,
  accounts,
}) => {
  const admin = bearer(accounts.admin);
  const staff = bearer(accounts.employee);
  const employeeUserId = await userId(request, accounts.employee);
  const olte = await request.post('/api/v1/network/oltes', {
    headers: admin,
    data: { code: `QA-OLT-${tag()}`, name: 'QA OLTE', totalPorts: 2 },
  });
  expect(olte.status(), await olte.text()).toBe(201);
  const olteId = (await olte.json()).id as string;
  const usedPorts = async () =>
    ((
      await (
        await request.get(`/api/v1/network/oltes/${olteId}`, { headers: admin })
      ).json()
    ).usedPorts ?? 0) as number;
  const connect = (data: Record<string, unknown>) =>
    request.post('/api/v1/network/connections', {
      headers: admin,
      data: { connectionCode: `QA-C-${tag()}`, olteId, ...data },
    });

  // P4-MAP-01/06: two roots fill a 2-port OLTE; a third is refused,
  // a DISCONNECTED one is allowed.
  const rootA = await connect({ assignedEmployeeId: employeeUserId });
  expect(rootA.status(), await rootA.text()).toBe(201);
  const rootAId = (await rootA.json()).id as string;
  const rootB = await connect({});
  expect(rootB.status(), await rootB.text()).toBe(201);
  const rootBId = (await rootB.json()).id as string;
  expect(await usedPorts()).toBe(2);
  expect((await connect({})).status(), 'full OLTE').toBe(400);
  const parked = await connect({ status: 'DISCONNECTED' });
  expect(parked.status(), await parked.text()).toBe(201);

  // P4-MAP-08: capacity cannot drop below what is used.
  const shrink = await request.patch(`/api/v1/network/oltes/${olteId}`, {
    headers: admin,
    data: { totalPorts: 1 },
  });
  expect(shrink.status(), await shrink.text()).toBe(400);

  // P4-MAP-09: a root set to DISCONNECTED frees its port.
  const off = await request.patch(`/api/v1/network/connections/${rootBId}`, {
    headers: admin,
    data: { status: 'DISCONNECTED' },
  });
  expect(off.ok(), await off.text()).toBeTruthy();
  expect(await usedPorts()).toBe(1);

  // Children under root A.
  const childA = await connect({ parentConnectionId: rootAId });
  const childB = await connect({ parentConnectionId: rootAId });
  expect(childA.status(), await childA.text()).toBe(201);
  expect(childB.status(), await childB.text()).toBe(201);
  const childAId = (await childA.json()).id as string;
  const childBId = (await childB.json()).id as string;

  // P4-MAP-11: a node cannot move under its own subtree; a valid move works.
  const loop = await request.post(
    `/api/v1/network/connections/${rootAId}/move`,
    {
      headers: admin,
      data: { newParentConnectionId: childAId },
    },
  );
  expect(
    refused(loop.status()),
    `move into own subtree ${loop.status()}`,
  ).toBeTruthy();
  const move = await request.post(
    `/api/v1/network/connections/${childBId}/move`,
    {
      headers: admin,
      data: { newParentConnectionId: childAId },
    },
  );
  expect(move.ok(), await move.text()).toBeTruthy();

  // P4-MAP-16: another tenant's customer cannot be linked.
  const betaCustomer = await request.post('/api/v1/customers', {
    headers: bearer(accounts.other),
    data: { customerCode: `QA-BC-${tag()}`, legalName: 'QA beta customer' },
  });
  const link = await request.patch(`/api/v1/network/connections/${childAId}`, {
    headers: admin,
    data: { customerId: (await betaCustomer.json()).id },
  });
  expect(
    refused(link.status()),
    `foreign customer ${link.status()}`,
  ).toBeTruthy();

  // P4-MAP-14/15: field staff see their assigned route only.
  expect(
    (
      await request.get(`/api/v1/network/connections/${rootAId}`, {
        headers: staff,
      })
    ).status(),
    'assigned node',
  ).toBe(200);
  expect(
    (
      await request.get(`/api/v1/network/connections/${rootBId}`, {
        headers: staff,
      })
    ).status(),
    'unrelated node',
  ).toBe(404);
  expect(
    (
      await request.get(`/api/v1/network/oltes/${olteId}`, { headers: staff })
    ).status(),
  ).toBe(403);

  // P4-MAP-12: split root A's children under a new junction.
  const split = await request.post(
    `/api/v1/network/connections/${rootAId}/split`,
    {
      headers: admin,
      data: { junctionCode: `QA-J-${tag()}`, childConnectionIds: [childAId] },
    },
  );
  expect(split.ok(), await split.text()).toBeTruthy();
  const junctionId = (await split.json()).id as string;
  // The split moved child A WITH its own child B: both must still resolve,
  // and B keeps child A as its parent (descendant paths rewritten, not lost).
  const childAAfter = await request.get(
    `/api/v1/network/connections/${childAId}`,
    {
      headers: admin,
    },
  );
  expect(childAAfter.status(), await childAAfter.text()).toBe(200);
  expect((await childAAfter.json()).parentConnection?.id).toBe(junctionId);
  const childBAfter = await request.get(
    `/api/v1/network/connections/${childBId}`,
    {
      headers: admin,
    },
  );
  expect(childBAfter.status(), await childBAfter.text()).toBe(200);
  expect((await childBAfter.json()).parentConnection?.id).toBe(childAId);
  // P4-MAP-11 with descendants: move child A (and B under it) back to root A.
  const moveBack = await request.post(
    `/api/v1/network/connections/${childAId}/move`,
    {
      headers: admin,
      data: { newParentConnectionId: rootAId },
    },
  );
  expect(moveBack.ok(), await moveBack.text()).toBeTruthy();
  const tree = await request.get(`/api/v1/network/oltes/${olteId}/tree`, {
    headers: admin,
  });
  expect(tree.status(), await tree.text()).toBe(200);
  expect(await tree.text()).toContain(childBId);
  // P4-MAP-13: merge child A into root A; a node cannot merge into itself.
  expect(
    (
      await request.post(`/api/v1/network/connections/${childAId}/merge`, {
        headers: admin,
        data: { targetConnectionId: childAId },
      })
    ).status(),
  ).toBe(400);
  const merged = await request.post(
    `/api/v1/network/connections/${childAId}/merge`,
    {
      headers: admin,
      data: { targetConnectionId: rootAId },
    },
  );
  expect(merged.ok(), await merged.text()).toBeTruthy();

  // The other tenant sees none of this: QA_BETA does not have the module,
  // so its admin is stopped at the gate.
  const foreign = await request.get(`/api/v1/network/connections/${rootAId}`, {
    headers: bearer(accounts.other),
  });
  expect(foreign.status(), await foreign.text()).toBe(403);
  expect(await foreign.text()).toContain('not enabled');
  // View-only field staff cannot change anything.
  const staffEdit = await request.patch(
    `/api/v1/network/connections/${rootAId}`,
    {
      headers: staff,
      data: { remarks: 'QA staff edit' },
    },
  );
  expect(staffEdit.status(), await staffEdit.text()).toBe(403);
});
