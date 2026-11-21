import type { APIRequestContext } from '@playwright/test';
import {
  test,
  expect,
  bearer,
  credentials,
  login,
  type Session,
} from './fixtures';
import { newHandset, signedPunch } from './punch-signing';

/**
 * Login-heavy Phase 2 auth cases (test plan P2-AUTH-xx).
 *
 * /auth/login allows 10 requests per minute per client IP, and the whole run
 * comes from one IP. This project runs after the others and starts each group
 * with a fresh rate-limit window, so each group may log in at most 10 times.
 * Each group uses its own seeded account, so locking or force-logging-out it
 * never disturbs the shared sessions the other tests use.
 */
test.describe.configure({ mode: 'serial' });

const WINDOW_MS = 61_000;
const freshLoginWindow = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, WINDOW_MS));

const attempt = (request: APIRequestContext, role: string, password?: string) =>
  request.post('/api/v1/auth/login', {
    data: { ...credentials(role), ...(password ? { password } : {}) },
  });

const me = (request: APIRequestContext, session: Session) =>
  request.get('/api/v1/auth/me', { headers: bearer(session) });

const refresh = (request: APIRequestContext, session: Session) =>
  request.post('/api/v1/auth/refresh', {
    data: { refreshToken: session.refreshToken },
  });

/** Access tokens die once the 5 s user cache expires; poll up to 10 s. */
async function expectSignedOut(
  request: APIRequestContext,
  session: Session,
): Promise<void> {
  await expect
    .poll(async () => (await me(request, session)).status(), {
      timeout: 10_000,
      intervals: [1_000],
    })
    .toBe(401);
  expect((await refresh(request, session)).status()).toBe(401);
}

test('P2-AUTH-10/11/13 lockout after 5 failures, locked means locked, admin unlock', async ({
  request,
  accounts,
}) => {
  test.setTimeout(150_000);
  await freshLoginWindow();
  // 8 logins in this window.
  const first = await login(request, 'lockout');
  const userId = (await (await me(request, first)).json()).userId as string;

  for (let i = 1; i <= 5; i++) {
    const wrong = await attempt(request, 'lockout', `wrong-${i}-${Date.now()}`);
    expect(wrong.status(), `wrong attempt ${i}`).toBe(401);
  }

  // P2-AUTH-11: the right password is refused while the lock is open.
  const locked = await attempt(request, 'lockout');
  expect(locked.status(), await locked.text()).toBe(403);
  expect((await locked.json()).message).toContain('PWD-006');

  const status = await request.get(`/api/v1/security/users/${userId}/status`, {
    headers: bearer(accounts.admin),
  });
  expect(status.status(), await status.text()).toBe(200);

  // P2-AUTH-13: an administrator unlock lets the user straight back in.
  const unlock = await request.post(`/api/v1/security/users/${userId}/unlock`, {
    headers: bearer(accounts.admin),
  });
  expect(unlock.ok(), await unlock.text()).toBeTruthy();
  const after = await attempt(request, 'lockout');
  expect(after.status(), await after.text()).toBe(200);
});

test('P2-AUTH-07/16/06 session revoke, admin force logout, logout everywhere', async ({
  request,
  accounts,
}, testInfo) => {
  test.setTimeout(150_000);
  await freshLoginWindow();
  // 4 logins in this window.
  const phone = await login(request, 'sessions');
  const laptop = await login(request, 'sessions');
  const userId = (await (await me(request, phone)).json()).userId as string;
  const laptopSessionId = (await (await me(request, laptop)).json())
    .sessionId as string;

  // P2-AUTH-07: the user lists their sessions and revokes the other device.
  const own = await request.get('/api/v1/auth/sessions', {
    headers: bearer(phone),
  });
  expect(own.status(), await own.text()).toBe(200);
  const ownIds = ((await own.json()) as { id: string }[]).map((s) => s.id);
  expect(ownIds).toContain(laptopSessionId);
  const revoke = await request.post(
    `/api/v1/auth/sessions/${laptopSessionId}/revoke`,
    { headers: bearer(phone) },
  );
  expect(revoke.status(), await revoke.text()).toBe(200);
  expect((await refresh(request, laptop)).status()).toBe(401);
  // AUTH-009: a revoked session's access token lives until it expires
  // (15 min); SessionManagement.md §11 only requires refresh to stop.
  testInfo.annotations.push({
    type: 'AUTH-009',
    description: `access token of a revoked session -> ${(await me(request, laptop)).status()}`,
  });

  // P2-AUTH-16: an admin sees the user's sessions and forces logout.
  const listed = await request.get(
    `/api/v1/security/users/${userId}/sessions`,
    {
      headers: bearer(accounts.admin),
    },
  );
  expect(listed.status(), await listed.text()).toBe(200);
  const listedIds = ((await listed.json()) as { id: string }[]).map(
    (s) => s.id,
  );
  expect(listedIds).not.toContain(laptopSessionId);
  const forced = await request.post(
    `/api/v1/security/users/${userId}/sessions/revoke-all`,
    { headers: bearer(accounts.admin) },
  );
  expect(forced.ok(), await forced.text()).toBeTruthy();
  await expectSignedOut(request, phone);

  // P2-AUTH-06: "log out all" on one device signs out every device.
  const deviceA = await login(request, 'sessions');
  const deviceB = await login(request, 'sessions');
  const all = await request.post('/api/v1/auth/logout-all', {
    headers: bearer(deviceA),
  });
  expect(all.status(), await all.text()).toBe(200);
  await expectSignedOut(request, deviceB);
});

/**
 * P3-DEV-01 to 06: one handset per employee, changes only through an
 * approved request. Runs in the sessions window (1 more login, 5 in total).
 * Uses the dedicated QA-DEVICES employee; the tenant allows 2 change
 * requests per 90 days, so the flow spends exactly 2 and checks the third.
 */
test('P3-DEV-01..06 bind once, change only by approved request, admin revoke', async ({
  request,
  accounts,
}) => {
  const phone = await login(request, 'devices');
  const staff = bearer(phone);
  const admin = bearer(accounts.admin);
  const tag = Math.random().toString(36).slice(2, 10);
  const handsetA = `qa-handset-a-${tag}`;
  const handsetB = `qa-handset-b-${tag}`;
  const myDevice = async () => {
    const me = await request.get('/api/v1/devices/me', { headers: staff });
    expect(me.status(), await me.text()).toBe(200);
    return (await me.json()) as {
      device: { id: string; deviceId: string; publicKey: string } | null;
      pendingRequest: { id: string } | null;
    };
  };
  const post = (path: string, data: object, headers = staff) =>
    request.post(`/api/v1/devices/${path}`, { headers, data });
  const changeRequest = () =>
    post('change-requests', {
      newDeviceId: handsetB,
      publicKey: `ed25519:qa-key-b-${tag}`,
      reason: 'UPGRADED',
    });

  // P3-DEV-01: bind on first use.
  expect((await myDevice()).device).toBeNull();
  const bound = await post('bind', {
    deviceId: handsetA,
    publicKey: `ed25519:qa-key-a-${tag}`,
  });
  expect(bound.status(), await bound.text()).toBe(201);
  expect((await myDevice()).device?.deviceId).toBe(handsetA);

  // P3-DEV-05: no self-rebind to another handset.
  const rebind = await post('bind', {
    deviceId: handsetB,
    publicKey: `ed25519:qa-key-b-${tag}`,
  });
  expect(rebind.status(), await rebind.text()).toBe(409);
  // A handset bound to this employee cannot be bound by a coworker either.
  const shared = await post(
    'bind',
    { deviceId: handsetA, publicKey: `ed25519:qa-key-x-${tag}` },
    bearer(accounts.employee),
  );
  expect(shared.status(), await shared.text()).toBe(409);

  // P3-DEV-02 + 04: request a change; another tenant cannot decide it; the
  // admin rejects it and the old handset stays bound.
  const first = await changeRequest();
  expect(first.status(), await first.text()).toBe(201);
  const firstId = (await first.json()).id as string;
  expect((await changeRequest()).status(), 'second pending request').toBe(409);
  expect(
    (
      await post(
        `change-requests/${firstId}/approve`,
        {},
        bearer(accounts.other),
      )
    ).status(),
    'other tenant approve',
  ).toBe(404);
  const rejected = await post(
    `change-requests/${firstId}/reject`,
    { rejectionReason: 'QA: please bring the old handset' },
    admin,
  );
  expect(rejected.ok(), await rejected.text()).toBeTruthy();
  expect(
    (await post(`change-requests/${firstId}/approve`, {}, admin)).status(),
    'approve after reject',
  ).toBe(400);
  expect((await myDevice()).device?.deviceId).toBe(handsetA);

  // P3-DEV-03: a new request approved; the new handset claims with its key.
  const second = await changeRequest();
  expect(second.status(), await second.text()).toBe(201);
  const approved = await post(
    `change-requests/${(await second.json()).id}/approve`,
    {},
    admin,
  );
  expect(approved.ok(), await approved.text()).toBeTruthy();
  const pendingClaim = (await myDevice()).device;
  expect(pendingClaim?.deviceId).toBe(handsetB);
  expect(pendingClaim?.publicKey ?? '').toBe('');
  const claim = await post('claim', {
    deviceId: handsetB,
    publicKey: `ed25519:qa-key-b-${tag}`,
  });
  expect(claim.ok(), await claim.text()).toBeTruthy();
  const reclaim = await post('claim', {
    deviceId: handsetB,
    publicKey: `ed25519:qa-key-evil-${tag}`,
  });
  expect(reclaim.status(), 'claim twice').toBe(409);
  // The quota (2 per 90 days) is spent.
  expect((await changeRequest()).status(), 'third request').toBe(403);

  // P3-DEV-06: the admin revokes; the employee is unbound and binds again.
  const device = (await myDevice()).device;
  const revoked = await post(
    `${device!.id}/revoke`,
    { reason: 'QA revoke' },
    admin,
  );
  expect(revoked.ok(), await revoked.text()).toBeTruthy();
  expect((await myDevice()).device).toBeNull();
  const again = await post('bind', {
    deviceId: handsetA,
    publicKey: `ed25519:qa-key-a2-${tag}`,
  });
  expect(again.status(), await again.text()).toBe(201);
});

/** Filled by the signed-punch case, read by the attendance admin case. */
const punched: {
  worker?: Session;
  sessionId?: string;
  attendanceId?: string;
  punchIn?: string;
} = {};

/**
 * P3-ATT signed punches with a real Ed25519 handset key (ATT-001/002/003,
 * P3-GEO-03/04). One more login in the sessions window (6 in total), on the
 * dedicated QA-PUNCH employee.
 */
test('ATT-001..003 signed punch: geofence, freshness, tamper, replay, in/out', async ({
  request,
  accounts,
}) => {
  const worker = await login(request, 'punch');
  punched.worker = worker;
  const staff = bearer(worker);
  const admin = bearer(accounts.admin);
  const SITE = { latitude: 12.9716, longitude: 77.5946 };
  const handset = newHandset();
  const punch = (body: object) =>
    request.post('/api/v1/attendance/punch', { headers: staff, data: body });
  const refusedWith = async (body: object, status: number, code?: string) => {
    const response = await punch(body);
    const text = await response.text();
    expect(response.status(), text).toBe(status);
    if (code) expect(JSON.parse(text).errorCode, text).toBe(code);
  };

  const employees = (await (
    await request.get('/api/v1/employees?take=100', { headers: admin })
  ).json()) as { id: string; employeeCode: string }[];
  const employeeId = employees.find((e) => e.employeeCode === 'QA-PUNCH')!.id;
  expect(employeeId).toBeTruthy();

  const bound = await request.post('/api/v1/devices/bind', {
    headers: staff,
    data: { deviceId: handset.deviceId, publicKey: handset.publicKey },
  });
  expect(bound.status(), await bound.text()).toBe(201);

  // P3-GEO-04: bound, but no work location assigned.
  await refusedWith(signedPunch(handset, SITE), 400, 'GEOFENCE-001');

  const site = await request.post('/api/v1/attendance/geofence', {
    headers: admin,
    data: {
      name: `QA punch site ${handset.deviceId.slice(-8)}`,
      ...SITE,
      radiusMeters: 150,
    },
  });
  expect(site.status(), await site.text()).toBe(201);
  const siteId = (await site.json()).id as string;
  try {
    const assigned = await request.post(
      `/api/v1/attendance/geofence/${siteId}/employees`,
      { headers: admin, data: { employeeIds: [employeeId], reassign: true } },
    );
    expect(assigned.ok(), await assigned.text()).toBeTruthy();

    // P3-GEO-03: assigned, but standing ~60 km away.
    await refusedWith(
      signedPunch(handset, { latitude: 13.5, longitude: 77.5946 }),
      400,
      'GEOFENCE-005',
    );
    // ATT-003: stale, imprecise, mocked, tampered and foreign-handset punches.
    await refusedWith(
      signedPunch(handset, {
        ...SITE,
        timestamp: new Date(Date.now() - 10 * 60_000).toISOString(),
      }),
      400,
      'PUNCH_TIMESTAMP_INVALID',
    );
    await refusedWith(
      signedPunch(handset, { ...SITE, accuracy: 500 }),
      400,
      'GPS_ACCURACY_TOO_LOW',
    );
    await refusedWith(
      signedPunch(handset, { ...SITE, isMockLocation: true }),
      400,
      'MOCK_LOCATION_DETECTED',
    );
    await refusedWith(
      { ...signedPunch(handset, SITE), latitude: SITE.latitude + 0.0001 },
      400,
      'INVALID_DEVICE_SIGNATURE',
    );
    await refusedWith(signedPunch(newHandset(), SITE), 401, 'UNTRUSTED_DEVICE');

    // ATT-001: a valid punch checks in; the same signed body again is a replay.
    const checkIn = signedPunch(handset, SITE);
    const inResponse = await punch(checkIn);
    expect(inResponse.status(), await inResponse.text()).toBe(201);
    const session = (await inResponse.json()) as {
      id: string;
      attendanceId: string;
      punchIn: string;
      punchOut: string | null;
    };
    punched.sessionId = session.id;
    punched.attendanceId = session.attendanceId;
    punched.punchIn = session.punchIn;
    expect(session.punchOut).toBeNull();
    await refusedWith(checkIn, 409);
    const today = await request.get('/api/v1/attendance/today', {
      headers: staff,
    });
    expect(today.status(), await today.text()).toBe(200);
    expect(await today.text()).toContain(session.id);

    // The next punch checks out; a third within 15 minutes is debounced.
    const outResponse = await punch(signedPunch(handset, SITE));
    expect(outResponse.status(), await outResponse.text()).toBe(201);
    expect((await outResponse.json()).punchOut).toBeTruthy();
    await refusedWith(signedPunch(handset, SITE), 400);
  } finally {
    await request.delete(`/api/v1/attendance/geofence/${siteId}`, {
      headers: admin,
    });
  }
});

/**
 * P3-ATT-15..18, 20: history, corrections, manual check-out and timeline on
 * the session the signed-punch case just closed. One more login (QA-PUNCH-2,
 * 7 in the window), because the 15-minute debounce stops QA-PUNCH opening a
 * second session for the manual check-out.
 */
test('P3-ATT-15..18/20 history, corrections, manual check-out, timeline', async ({
  request,
  accounts,
}) => {
  const { worker, sessionId, attendanceId, punchIn } = punched;
  expect(
    worker && sessionId && attendanceId && punchIn,
    'punch case ran',
  ).toBeTruthy();
  const staff = bearer(worker!);
  const admin = bearer(accounts.admin);
  const att = (path: string) => `/api/v1/attendance/${path}`;
  const correction = (correctionType: string, requestedValue: string) =>
    request.post(att('corrections'), {
      headers: staff,
      data: {
        attendanceId,
        correctionType,
        requestedValue,
        reason: 'QA correction',
      },
    });

  // P3-ATT-15: the employee's own history holds the day.
  const own = await request.get(att('daily-logs'), { headers: staff });
  expect(own.status(), await own.text()).toBe(200);
  expect(await own.text()).toContain(attendanceId!);

  // P3-ATT-20: the session timeline, for its owner only.
  const timeline = await request.get(att(`sessions/${sessionId}/timeline`), {
    headers: staff,
  });
  expect(timeline.status(), await timeline.text()).toBe(200);
  expect((await timeline.json()).sessionId).toBe(sessionId);
  const foreign = await request.get(att(`sessions/${sessionId}/timeline`), {
    headers: bearer(accounts.employee),
  });
  expect(foreign.status(), 'coworker timeline').toBe(404);

  // P3-ATT-16: a correction to a check-out BEFORE the check-in cannot be
  // approved (it would credit negative hours); the admin rejects it.
  const before = new Date(new Date(punchIn!).getTime() - 60 * 60_000);
  const bad = await correction('WRONG_CHECK_OUT_TIME', before.toISOString());
  expect(bad.status(), await bad.text()).toBe(201);
  const badId = (await bad.json()).id as string;
  const duplicate = await correction(
    'WRONG_CHECK_OUT_TIME',
    new Date().toISOString(),
  );
  expect(duplicate.status(), 'duplicate open correction').toBe(409);
  const selfApproval = await request.post(att(`corrections/${badId}/approve`), {
    headers: staff,
  });
  expect(selfApproval.status(), 'self approval').toBe(403);
  const otherTenant = await request.post(att(`corrections/${badId}/approve`), {
    headers: bearer(accounts.other),
  });
  expect(otherTenant.status(), 'other tenant approval').toBe(404);
  const refused = await request.post(att(`corrections/${badId}/approve`), {
    headers: admin,
  });
  expect(refused.status(), await refused.text()).toBe(400);
  const rejected = await request.post(att(`corrections/${badId}/reject`), {
    headers: admin,
    data: { notes: 'QA: before check-in' },
  });
  expect(rejected.ok(), await rejected.text()).toBeTruthy();

  // A valid correction is applied to the session.
  const fixedOut = new Date(Date.now() - 1_000).toISOString();
  const good = await correction('WRONG_CHECK_OUT_TIME', fixedOut);
  expect(good.status(), await good.text()).toBe(201);
  const approved = await request.post(
    att(`corrections/${(await good.json()).id}/approve`),
    { headers: admin },
  );
  expect(approved.ok(), await approved.text()).toBeTruthy();
  expect(['APPLIED', 'APPROVED']).toContain(
    (await approved.json()).workflowStatus,
  );
  const after = await request.get(att(`sessions/${sessionId}/timeline`), {
    headers: staff,
  });
  expect(new Date((await after.json()).punchOut).toISOString()).toBe(fixedOut);

  // The employee can withdraw an open request of their own.
  const draft = await correction('MISSING_CHECK_IN', new Date().toISOString());
  expect(draft.status(), await draft.text()).toBe(201);
  const cancelled = await request.post(
    att(`corrections/${(await draft.json()).id}/cancel`),
    { headers: staff },
  );
  expect(cancelled.ok(), await cancelled.text()).toBeTruthy();

  // P3-ATT-18: manual check-out of a still-open session, by an admin only.
  const second = await login(request, 'punch2');
  const handset = newHandset();
  const bind = await request.post('/api/v1/devices/bind', {
    headers: bearer(second),
    data: { deviceId: handset.deviceId, publicKey: handset.publicKey },
  });
  expect(bind.status(), await bind.text()).toBe(201);
  const SITE = { latitude: 12.9716, longitude: 77.5946 };
  const site = await request.post(att('geofence'), {
    headers: admin,
    data: {
      name: `QA manual site ${handset.deviceId.slice(-8)}`,
      ...SITE,
      radiusMeters: 150,
    },
  });
  expect(site.status(), await site.text()).toBe(201);
  const siteId = (await site.json()).id as string;
  try {
    const employees = (await (
      await request.get('/api/v1/employees?take=100', { headers: admin })
    ).json()) as { id: string; employeeCode: string }[];
    const employeeId = employees.find(
      (e) => e.employeeCode === 'QA-PUNCH-2',
    )!.id;
    const assign = await request.post(att(`geofence/${siteId}/employees`), {
      headers: admin,
      data: { employeeIds: [employeeId], reassign: true },
    });
    expect(assign.ok(), await assign.text()).toBeTruthy();
    const checkIn = await request.post(att('punch'), {
      headers: bearer(second),
      data: signedPunch(handset, SITE),
    });
    expect(checkIn.status(), await checkIn.text()).toBe(201);
    const open = (await checkIn.json()) as { id: string; punchIn: string };
    const manual = (headers: Record<string, string>, checkoutTime: string) =>
      request.post(att('manual-checkout'), {
        headers,
        data: {
          attendanceSessionId: open.id,
          checkoutTime,
          reason: 'QA forgot to check out',
        },
      });

    const byStaff = await manual(bearer(second), new Date().toISOString());
    expect(byStaff.status(), 'staff').toBe(403);
    const early = new Date(
      new Date(open.punchIn).getTime() - 60_000,
    ).toISOString();
    expect((await manual(admin, early)).status(), 'before check-in').toBe(400);
    const future = new Date(Date.now() + 3_600_000).toISOString();
    expect((await manual(admin, future)).status(), 'in the future').toBe(400);
    const closed = await manual(admin, new Date().toISOString());
    expect(closed.ok(), await closed.text()).toBeTruthy();
    const body = (await closed.json()) as {
      punchOut: string;
      sessionStatus: string;
    };
    expect(body.punchOut).toBeTruthy();
    expect(body.sessionStatus).toBe('CHECKED_OUT');
    expect(
      (await manual(admin, new Date().toISOString())).status(),
      'twice',
    ).toBe(400);
  } finally {
    await request.delete(att(`geofence/${siteId}`), { headers: admin });
  }
});
