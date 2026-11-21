import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';

/**
 * Phase 3 visit management through the API (test plan P3-VIS-xx). The mobile
 * screens are covered on device; this checks the rules the screens rely on.
 *
 * The QA employee may hold only one active visit, so every visit a test
 * starts is driven to a terminal state before the test ends.
 */

interface Visit {
  readonly id: string;
  readonly status: string;
  readonly actualStartAt: string | null;
  readonly statusHistory?: { fromStatus: string; toStatus: string }[];
}

async function employeeIdByCode(
  request: APIRequestContext,
  admin: Session,
  code: string,
): Promise<string> {
  const response = await request.get('/api/v1/employees?take=100', {
    headers: bearer(admin),
  });
  expect(response.status(), await response.text()).toBe(200);
  const body = (await response.json()) as
    | { id: string; employeeCode: string }[]
    | { items: { id: string; employeeCode: string }[] };
  const rows = Array.isArray(body) ? body : body.items;
  const row = rows.find((item) => item.employeeCode === code);
  expect(row, `employee ${code} exists`).toBeTruthy();
  return row!.id;
}

async function createVisit(
  request: APIRequestContext,
  admin: Session,
): Promise<Visit> {
  const response = await request.post('/api/v1/visits', {
    headers: bearer(admin),
    data: {
      purpose: `QA visit ${randomUUID().slice(0, 8)}`,
      plannedStartAt: new Date(Date.now() + 3_600_000).toISOString(),
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  const visit = (await response.json()) as Visit;
  expect(visit.status).toBe('PLANNED');
  return visit;
}

/** POSTs a visit action and returns the response, for status assertions. */
const act = (
  request: APIRequestContext,
  session: Session,
  id: string,
  action: string,
  data: Record<string, unknown> = {},
) =>
  request.post(`/api/v1/visits/${id}/${action}`, {
    headers: bearer(session),
    data,
  });

async function expectStatus(
  request: APIRequestContext,
  session: Session,
  id: string,
  action: string,
  status: string,
  data: Record<string, unknown> = {},
): Promise<Visit> {
  const response = await act(request, session, id, action, data);
  const text = await response.text();
  expect(response.ok(), `${action}: ${text}`).toBeTruthy();
  const visit = JSON.parse(text) as Visit;
  expect(visit.status, `${action} result`).toBe(status);
  return visit;
}

test('P3-VIS-01/02/04/05/07/13 full lifecycle with valid transitions only', async ({
  request,
  accounts,
}) => {
  const { admin, employee } = accounts;
  const employeeId = await employeeIdByCode(request, admin, 'QA-EMPLOYEE');
  const visit = await createVisit(request, admin);
  let terminal = false;
  try {
    // Not assigned yet: the employee cannot accept it.
    expect((await act(request, employee, visit.id, 'accept')).ok()).toBeFalsy();
    await expectStatus(request, admin, visit.id, 'assign', 'ASSIGNED', {
      employeeId,
    });

    // P3-VIS-01: the assigned list holds it.
    const assigned = await request.get('/api/v1/visits/assigned', {
      headers: bearer(employee),
    });
    expect(assigned.status(), await assigned.text()).toBe(200);
    expect(await assigned.text()).toContain(visit.id);

    // Starting before accepting skips a stage.
    expect((await act(request, employee, visit.id, 'start')).status()).toBe(
      409,
    );
    await expectStatus(request, employee, visit.id, 'accept', 'ACCEPTED');
    const started = await expectStatus(
      request,
      employee,
      visit.id,
      'start',
      'STARTED',
      { latitude: 12.9716, longitude: 77.5946 },
    );
    expect(started.actualStartAt).toBeTruthy();

    // P3-VIS-04: pause and resume keep the original start time.
    await expectStatus(request, employee, visit.id, 'pause', 'PAUSED');
    const resumed = await expectStatus(
      request,
      employee,
      visit.id,
      'resume',
      'STARTED',
    );
    expect(resumed.actualStartAt).toBe(started.actualStartAt);

    // Notes on an own visit (P3-VIS-08 online part).
    const note = await request.post(`/api/v1/visits/${visit.id}/notes`, {
      headers: bearer(employee),
      data: { note: 'QA note' },
    });
    expect(note.status(), await note.text()).toBe(201);

    // P3-VIS-05: completion needs an outcome.
    expect((await act(request, employee, visit.id, 'complete')).status()).toBe(
      400,
    );
    await expectStatus(request, employee, visit.id, 'complete', 'COMPLETED', {
      outcome: 'QA resolved',
    });
    // A completed visit cannot be paused again.
    expect((await act(request, employee, visit.id, 'pause')).status()).toBe(
      409,
    );

    await expectStatus(request, admin, visit.id, 'approve', 'APPROVED');
    await expectStatus(request, admin, visit.id, 'close', 'CLOSED');
    terminal = true;
    // CLOSED is terminal.
    for (const action of ['reopen', 'cancel'])
      expect(
        (await act(request, admin, visit.id, action, { notes: 'QA' })).status(),
        `${action} after close`,
      ).toBe(409);

    // P3-VIS-07: the detail carries the whole history and the note.
    const detail = await request.get(`/api/v1/visits/${visit.id}`, {
      headers: bearer(employee),
    });
    expect(detail.status(), await detail.text()).toBe(200);
    const full = (await detail.json()) as Visit & {
      visitNotes: { note: string }[];
    };
    expect(full.statusHistory?.map((h) => h.toStatus)).toEqual(
      expect.arrayContaining([
        'ASSIGNED',
        'ACCEPTED',
        'STARTED',
        'PAUSED',
        'COMPLETED',
        'APPROVED',
        'CLOSED',
      ]),
    );
    expect(full.visitNotes.map((n) => n.note)).toContain('QA note');
  } finally {
    if (!terminal) await act(request, employee, visit.id, 'abort');
  }
});

test('P3-VIS-13 cancelled visit cannot be assigned again', async ({
  request,
  accounts,
}) => {
  const { admin } = accounts;
  const employeeId = await employeeIdByCode(request, admin, 'QA-EMPLOYEE');
  const visit = await createVisit(request, admin);
  await expectStatus(request, admin, visit.id, 'cancel', 'CANCELLED', {
    notes: 'QA cancel',
  });
  expect(
    (await act(request, admin, visit.id, 'assign', { employeeId })).status(),
  ).toBe(409);
});

test('P3-VIS-10 field employee cannot create visits', async ({
  request,
  accounts,
}) => {
  const response = await request.post('/api/v1/visits', {
    headers: bearer(accounts.employee),
    data: {
      purpose: 'QA forced create',
      plannedStartAt: new Date().toISOString(),
    },
  });
  expect(response.status()).toBe(403);
});

test("P3-VIS-12 another employee's visit is not available", async ({
  request,
  accounts,
}) => {
  const { admin, employee } = accounts;
  // A second employee (no login) owns this visit.
  const tag = randomUUID().slice(0, 8);
  const other = await request.post('/api/v1/employees', {
    headers: bearer(admin),
    data: {
      employeeCode: `QA-OTHER-${tag}`,
      firstName: 'Other',
      lastName: tag,
    },
  });
  expect(other.status(), await other.text()).toBe(201);
  const visit = await createVisit(request, admin);
  await expectStatus(request, admin, visit.id, 'assign', 'ASSIGNED', {
    employeeId: (await other.json()).id,
  });
  try {
    const headers = bearer(employee);
    const read = await request.get(`/api/v1/visits/${visit.id}`, { headers });
    expect(read.status(), 'read').toBe(404);
    const notes = await request.get(`/api/v1/visits/${visit.id}/notes`, {
      headers,
    });
    expect(notes.status(), 'list notes').toBe(404);
    const add = await request.post(`/api/v1/visits/${visit.id}/notes`, {
      headers,
      data: { note: 'QA intrusion' },
    });
    expect(add.status(), 'add note').toBe(404);
    const accept = await act(request, employee, visit.id, 'accept');
    expect([403, 404], `accept ${accept.status()}`).toContain(accept.status());
    const assigned = await request.get('/api/v1/visits/assigned', { headers });
    expect(await assigned.text()).not.toContain(visit.id);
  } finally {
    await act(request, admin, visit.id, 'cancel', { notes: 'QA clean up' });
  }
});
