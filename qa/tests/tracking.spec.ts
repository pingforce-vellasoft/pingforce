import { randomUUID } from 'node:crypto';
import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';

/**
 * Phase 3 background tracking through the API (P3-TRK-03, 04, 05, 07). The
 * foreground service, battery and permission flows are device cases.
 */

interface Point {
  readonly latitude: number;
  readonly capturedAt: string;
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
  const rows = (await response.json()) as {
    id: string;
    employeeCode: string;
  }[];
  const row = rows.find((item) => item.employeeCode === code);
  expect(row, `employee ${code} exists`).toBeTruthy();
  return row!.id;
}

const ping = (
  latitude: number,
  minutesAgo: number,
  clientRef = randomUUID(),
) => ({
  clientRef,
  latitude,
  longitude: 77.5946,
  accuracy: 8,
  capturedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
});

const upload = (
  request: APIRequestContext,
  session: Session,
  pings: ReturnType<typeof ping>[],
) =>
  request.post('/api/v1/tracking/ping/batch', {
    headers: bearer(session),
    data: { pings },
  });

async function liveLatitude(
  request: APIRequestContext,
  admin: Session,
  employeeId: string,
): Promise<number | undefined> {
  const live = await request.get('/api/v1/tracking/live', {
    headers: bearer(admin),
  });
  expect(live.status(), await live.text()).toBe(200);
  const rows = (await live.json()).data as {
    employeeId: string;
    latitude: number;
  }[];
  return rows.find((r) => r.employeeId === employeeId)?.latitude;
}

test('P3-TRK-04/05/07 pings: idempotent, ordered, clock-guarded, on the live map', async ({
  request,
  accounts,
}) => {
  const { admin, employee } = accounts;
  const employeeId = await employeeIdByCode(request, admin, 'QA-EMPLOYEE');
  // Distinct latitudes identify this run's points. Positions are compared to
  // 5 decimals (about 1 m): the live table stores them with less precision
  // than a JS double, so 10.860999999999999 comes back as 10.861.
  const lat = (offset: number) => Number((base + offset).toFixed(4));
  const base = 10 + Math.floor(Math.random() * 1000) / 1000;
  const older = ping(lat(0), 10);
  const newer = ping(lat(0.001), 5);

  const first = await upload(request, employee, [newer, older]);
  expect(first.status(), await first.text()).toBe(201);
  expect(await first.json()).toEqual(
    expect.objectContaining({ accepted: 2, received: 2 }),
  );

  // P3-TRK-04: an offline retry of the same batch stores nothing twice.
  const retry = await upload(request, employee, [newer, older]);
  expect((await retry.json()).accepted).toBe(0);

  // P3-TRK-05: the live map shows the newest fix, and a late older ping
  // cannot rewind it.
  expect(await liveLatitude(request, admin, employeeId)).toBeCloseTo(
    newer.latitude,
    5,
  );
  await upload(request, employee, [ping(lat(0.002), 30)]);
  expect(await liveLatitude(request, admin, employeeId)).toBeCloseTo(
    newer.latitude,
    5,
  );

  // P3-TRK-07: a ping dated tomorrow is dropped and cannot pin the map.
  const future = {
    ...ping(lat(0.003), 0),
    capturedAt: new Date(Date.now() + 86_400_000).toISOString(),
  };
  const guarded = await upload(request, employee, [future]);
  expect(await guarded.json()).toEqual(
    expect.objectContaining({ accepted: 0, rejected: 1 }),
  );
  expect(await liveLatitude(request, admin, employeeId)).toBeCloseTo(
    newer.latitude,
    5,
  );
  const current = ping(lat(0.004), 0);
  await upload(request, employee, [current]);
  expect(await liveLatitude(request, admin, employeeId)).toBeCloseTo(
    current.latitude,
    5,
  );

  // The trail returns this run's points in time order, without duplicates.
  const from = new Date(Date.now() - 60 * 60_000).toISOString();
  const trail = await request.get(
    `/api/v1/tracking/${employeeId}/trail?from=${encodeURIComponent(from)}`,
    { headers: bearer(admin) },
  );
  expect(trail.status(), await trail.text()).toBe(200);
  const points = ((await trail.json()).points as Point[]).filter(
    (p) => Math.abs(p.latitude - base) < 0.01,
  );
  const expected = [
    lat(0.002),
    older.latitude,
    newer.latitude,
    current.latitude,
  ];
  expect(points).toHaveLength(expected.length);
  points.forEach((p, i) => expect(p.latitude).toBeCloseTo(expected[i], 5));
  const summary = await request.get(`/api/v1/tracking/${employeeId}/summary`, {
    headers: bearer(admin),
  });
  expect(summary.status(), await summary.text()).toBe(200);

  // A malformed time window is a 400, not a server error.
  const bad = await request.get(
    `/api/v1/tracking/${employeeId}/trail?from=yesterday`,
    {
      headers: bearer(admin),
    },
  );
  expect(bad.status(), await bad.text()).toBe(400);
});

test('P3-TRK-03/05 who may send and who may watch', async ({
  request,
  accounts,
}) => {
  const { admin, employee, other } = accounts;
  const employeeId = await employeeIdByCode(request, admin, 'QA-EMPLOYEE');

  // The tenant admin has no field-staff employee record: never tracked.
  const office = await upload(request, admin, [ping(1, 0)]);
  expect([401, 403], `office ping ${office.status()}`).toContain(
    office.status(),
  );

  // Field staff send pings but cannot watch anyone.
  for (const path of ['live', `${employeeId}/trail`, `${employeeId}/summary`])
    expect(
      (
        await request.get(`/api/v1/tracking/${path}`, {
          headers: bearer(employee),
        })
      ).status(),
      path,
    ).toBe(403);

  // Another tenant's admin sees none of this tenant's positions.
  const foreignLive = await request.get('/api/v1/tracking/live', {
    headers: bearer(other),
  });
  expect(await foreignLive.text()).not.toContain(employeeId);
  const foreignTrail = await request.get(
    `/api/v1/tracking/${employeeId}/trail`,
    { headers: bearer(other) },
  );
  if (foreignTrail.status() === 200)
    expect((await foreignTrail.json()).points).toEqual([]);
  else expect(foreignTrail.status()).toBe(404);
});
