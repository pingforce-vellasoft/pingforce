import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';

/**
 * Phase 3 geofence assignment (P3-GEO-01, 02) and what a field employee may
 * see of it (P3-GEO-07). Field staff hold GEOFENCES READ at OWN scope so the
 * app can show their own sites; that must not open the roster of coworkers.
 */

const BASE = '/api/v1/attendance/geofence';

async function employeeIdByCode(
  request: APIRequestContext,
  admin: Session,
  code: string,
): Promise<string> {
  const response = await request.get('/api/v1/employees?take=100', {
    headers: bearer(admin),
  });
  expect(response.status(), await response.text()).toBe(200);
  const rows = (await response.json()) as {
    id: string;
    employeeCode: string;
  }[];
  const row = rows.find((item) => item.employeeCode === code);
  expect(row, `employee ${code} exists`).toBeTruthy();
  return row!.id;
}

async function createGeofence(
  request: APIRequestContext,
  admin: Session,
  latitude: number,
): Promise<string> {
  const response = await request.post(BASE, {
    headers: bearer(admin),
    data: {
      name: `QA site ${randomUUID().slice(0, 8)}`,
      latitude,
      longitude: 77.5946,
      radiusMeters: 150,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).id as string;
}

test('P3-GEO-01/02/07 assignment, and field staff see only their own', async ({
  request,
  accounts,
}) => {
  const { admin, employee } = accounts;
  const admins = bearer(admin);
  const staff = bearer(employee);
  const self = await employeeIdByCode(request, admin, 'QA-EMPLOYEE');
  const tag = randomUUID().slice(0, 8);
  const coworker = await request.post('/api/v1/employees', {
    headers: admins,
    data: { employeeCode: `QA-GEO-${tag}`, firstName: 'Geo', lastName: tag },
  });
  expect(coworker.status(), await coworker.text()).toBe(201);
  const coworkerId = (await coworker.json()).id as string;

  const mine = await createGeofence(request, admin, 12.9716);
  const elsewhere = await createGeofence(request, admin, 13.0827);
  try {
    // P3-GEO-01: both sites listed for the admin.
    const all = await (await request.get(BASE, { headers: admins })).text();
    expect(all).toContain(mine);
    expect(all).toContain(elsewhere);

    // P3-GEO-02: assign the QA employee and a coworker to one site.
    const assigned = await request.post(`${BASE}/${mine}/employees`, {
      headers: admins,
      data: { employeeIds: [self, coworkerId], reassign: true },
    });
    expect(assigned.ok(), await assigned.text()).toBeTruthy();
    const roster = await request.get(`${BASE}/${mine}/employees`, {
      headers: admins,
    });
    const rosterIds = (
      (await roster.json()) as { employees: { id: string }[] }
    ).employees.map((e) => e.id);
    expect(rosterIds).toEqual(expect.arrayContaining([self, coworkerId]));
    const forSelf = await request.get(`${BASE}/employee/${self}`, {
      headers: admins,
    });
    expect(await forSelf.text()).toContain(mine);

    // P3-GEO-07: the field employee sees their own site only ...
    const ownSites = await request.get(BASE, { headers: staff });
    expect(ownSites.status(), await ownSites.text()).toBe(200);
    const ownText = await ownSites.text();
    expect(ownText).toContain(mine);
    expect(ownText).not.toContain(elsewhere);
    const ownGeofences = await request.get(`${BASE}/employee/${self}`, {
      headers: staff,
    });
    expect(ownGeofences.status(), await ownGeofences.text()).toBe(200);

    // ... and nothing of their coworkers.
    const staffRoster = await request.get(`${BASE}/${mine}/employees`, {
      headers: staff,
    });
    expect(staffRoster.status(), await staffRoster.text()).toBe(200);
    expect(await staffRoster.text()).not.toContain(coworkerId);
    const picker = await request.get(
      `${BASE}/${mine}/assignable-employees?scope=ALL`,
      { headers: staff },
    );
    expect(await picker.text()).not.toContain(coworkerId);
    expect(
      (
        await request.get(`${BASE}/employee/${coworkerId}`, { headers: staff })
      ).status(),
      "coworker's geofences",
    ).toBe(404);
    expect(
      (
        await request.get(`${BASE}/assignments/summary`, { headers: staff })
      ).status(),
      'tenant coverage',
    ).toBe(403);
  } finally {
    // Deleting a geofence releases its assignments.
    for (const id of [mine, elsewhere])
      await request.delete(`${BASE}/${id}`, { headers: admins });
  }
});
