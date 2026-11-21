import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';

/**
 * FAULT-003 assignment and scope: a field employee (FAULTS at OWN scope)
 * reaches a fault only while they created it or it is assigned to them, and
 * cannot assign, escalate or delete at all.
 */

async function userId(
  request: APIRequestContext,
  session: Session,
): Promise<string> {
  const me = await request.get('/api/v1/auth/me', { headers: bearer(session) });
  expect(me.status(), await me.text()).toBe(200);
  return (await me.json()).userId as string;
}

async function adminFault(
  request: APIRequestContext,
  admin: Session,
): Promise<string> {
  const created = await request.post('/api/v1/faults', {
    headers: bearer(admin),
    data: {
      faultNumber: `QA-${randomUUID()}`,
      title: 'QA scope',
      description: 'Synthetic assignment scope regression',
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  return (await created.json()).id as string;
}

/** Every employee route on the fault, with the status each one returned. */
async function employeeAccess(
  request: APIRequestContext,
  employee: Session,
  id: string,
): Promise<Record<string, number>> {
  const headers = bearer(employee);
  const base = `/api/v1/faults/${id}`;
  return {
    read: (await request.get(base, { headers })).status(),
    attempts: (await request.get(`${base}/attempts`, { headers })).status(),
    update: (
      await request.patch(base, { headers, data: { title: 'QA intrusion' } })
    ).status(),
    note: (
      await request.post(`${base}/notes`, {
        headers,
        data: { notes: 'QA intrusion note' },
      })
    ).status(),
  };
}

const assign = (
  request: APIRequestContext,
  session: Session,
  id: string,
  assignedToId: string,
) =>
  request.post(`/api/v1/faults/${id}/assign`, {
    headers: bearer(session),
    data: { assignedToId, notes: 'QA assignment' },
  });

test('FAULT-003 employee reaches a fault only while it is theirs', async ({
  request,
  accounts,
}) => {
  const { admin, employee } = accounts;
  const employeeUserId = await userId(request, employee);
  const adminUserId = await userId(request, admin);
  const id = await adminFault(request, admin);
  const assigned = async () =>
    (
      await request.get('/api/v1/faults/assigned', {
        headers: bearer(employee),
      })
    ).text();

  // Not created by and not assigned to the employee: invisible.
  expect(await employeeAccess(request, employee, id)).toEqual({
    read: 404,
    attempts: 404,
    update: 404,
    note: 404,
  });
  expect(await assigned()).not.toContain(id);

  // Assigned to the employee: readable, and it shows in their list.
  const given = await assign(request, admin, id, employeeUserId);
  expect(given.ok(), await given.text()).toBeTruthy();
  const access = await employeeAccess(request, employee, id);
  expect(access.read, 'read once assigned').toBe(200);
  expect(access.attempts, 'attempts once assigned').toBe(200);
  expect(await assigned()).toContain(id);

  // Reassigned away: access ends again.
  const taken = await assign(request, admin, id, adminUserId);
  expect(taken.ok(), await taken.text()).toBeTruthy();
  const after = await employeeAccess(request, employee, id);
  expect(after.read, 'read after reassignment').toBe(404);
  expect(after.note, 'note after reassignment').toBe(404);
  expect(await assigned()).not.toContain(id);
});

test('FAULT-003 employee cannot assign, escalate or delete', async ({
  request,
  accounts,
}) => {
  const { admin, employee } = accounts;
  const id = await adminFault(request, admin);
  const given = await assign(
    request,
    admin,
    id,
    await userId(request, employee),
  );
  expect(given.ok(), await given.text()).toBeTruthy();
  const headers = bearer(employee);
  const base = `/api/v1/faults/${id}`;

  // Even on their own fault: these need ASSIGN, ESCALATE and DELETE.
  expect(
    (
      await assign(request, employee, id, await userId(request, employee))
    ).status(),
    'assign',
  ).toBe(403);
  expect(
    (await request.post(`${base}/escalate`, { headers })).status(),
    'escalate',
  ).toBe(403);
  expect((await request.delete(base, { headers })).status(), 'delete').toBe(
    403,
  );
  // The fault is still there for its owner.
  expect((await request.get(base, { headers: bearer(admin) })).status()).toBe(
    200,
  );
});

test('FAULT-003 assignment target must be an active user of the tenant', async ({
  request,
  accounts,
}) => {
  const { admin, other } = accounts;
  const id = await adminFault(request, admin);
  // A user of QA_BETA is not a valid assignee in QA_ALPHA.
  const foreign = await assign(
    request,
    admin,
    id,
    await userId(request, other),
  );
  expect([400, 403, 404]).toContain(foreign.status());
  const unknown = await assign(request, admin, id, randomUUID());
  expect([400, 403, 404]).toContain(unknown.status());
  const detail = await request.get(`/api/v1/faults/${id}`, {
    headers: bearer(admin),
  });
  expect((await detail.json()).assignedToId ?? null).toBeNull();
});
