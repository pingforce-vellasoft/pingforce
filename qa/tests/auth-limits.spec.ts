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
import { codeSentTo } from './mailbox';
import { LEAVE_DAYS } from './leave-days';
import { randomUUID } from 'node:crypto';

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

  // A valid correction is applied to the session. The punch case checked in
  // only moments ago, so "now minus a second" can fall before the check-in:
  // use check-in + 1 s, once that instant is safely in the past.
  const fixedOutMs = new Date(punchIn!).getTime() + 1_000;
  const waitMs = fixedOutMs + 1_000 - Date.now();
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  const fixedOut = new Date(fixedOutMs).toISOString();
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

/** A password the policy accepts, unique per call. */
const strongPassword = () =>
  `Qa!${Math.random().toString(36).slice(2, 10)}X9${Date.now() % 1000}z`;

/**
 * P2-AUTH-20/21/15 and P2-EMP-01 on a login the admin provisions here:
 * temporary password forced to change (server side), change password, reuse
 * refused, sign-in right after the change, and deactivation ending the login.
 * Fresh rate-limit window; 4 logins.
 */
test('P2-AUTH-20/21/15 + P2-EMP-01 temporary password, change, reuse, deactivate', async ({
  request,
  accounts,
}) => {
  test.setTimeout(150_000);
  await freshLoginWindow();
  const admin = bearer(accounts.admin);
  const roles = (await (
    await request.get('/api/v1/rbac/roles', { headers: admin })
  ).json()) as { id: string; code: string }[];
  const fieldRole = roles.find((r) => r.code === 'EMPLOYEE_FIELD_STAFF');
  expect(fieldRole, 'field staff role').toBeTruthy();

  const tagged = Math.random().toString(36).slice(2, 10);
  const email = `new-${tagged}@qa.pingforce.test`;
  const created = await request.post('/api/v1/employees', {
    headers: admin,
    data: {
      employeeCode: `QA-NEW-${tagged}`,
      firstName: 'New',
      lastName: tagged,
      primaryEmail: email,
      roleId: fieldRole!.id,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const { id: employeeId, tempPassword } = (await created.json()) as {
    id: string;
    tempPassword: string;
  };
  expect(tempPassword).toBeTruthy();

  const signIn = (password: string) =>
    request.post('/api/v1/auth/login', {
      data: { email, password, tenantCode: 'QA_ALPHA' },
    });

  // P2-AUTH-20: the temporary password signs in, but nothing else works
  // until it is changed.
  const first = await signIn(tempPassword);
  expect(first.status(), await first.text()).toBe(200);
  const temp = (await first.json()) as Session;
  const me = await (
    await request.get('/api/v1/auth/me', { headers: bearer(temp) })
  ).json();
  expect(me.mustChangePassword).toBe(true);
  const blocked = await request.get('/api/v1/leaves/my', {
    headers: bearer(temp),
  });
  expect(blocked.status(), await blocked.text()).toBe(403);
  expect((await blocked.json()).errorCode).toBe('PASSWORD_CHANGE_REQUIRED');

  // P2-AUTH-15: the current password cannot be "changed" to itself.
  const change = (
    session: Session,
    currentPassword: string,
    newPassword: string,
  ) =>
    request.post('/api/v1/auth/change-password', {
      headers: bearer(session),
      data: { currentPassword, newPassword },
    });
  const same = await change(temp, tempPassword, tempPassword);
  expect(same.status(), await same.text()).toBe(400);

  // P2-AUTH-21: change it; the old session ends, the old password stops.
  const newPassword = strongPassword();
  const changed = await change(temp, tempPassword, newPassword);
  expect(changed.ok(), await changed.text()).toBeTruthy();
  await expect
    .poll(
      async () =>
        (
          await request.get('/api/v1/auth/me', { headers: bearer(temp) })
        ).status(),
      {
        timeout: 10_000,
        intervals: [1_000],
      },
    )
    .toBe(401);
  expect((await signIn(tempPassword)).status(), 'old password').toBe(401);

  // Signing in straight after the change works at once (no stale cache).
  const fresh = await signIn(newPassword);
  expect(fresh.status(), await fresh.text()).toBe(200);
  const session = (await fresh.json()) as Session;
  const ok = await request.get('/api/v1/leaves/my', {
    headers: bearer(session),
  });
  expect(ok.status(), await ok.text()).toBe(200);
  // ... and the previous password is in the history.
  const back = await change(session, newPassword, tempPassword);
  expect(back.status(), await back.text()).toBe(400);

  // P2-EMP-01: deleting the employee ends the login.
  const removed = await request.delete(`/api/v1/employees/${employeeId}`, {
    headers: admin,
  });
  expect(removed.ok(), await removed.text()).toBeTruthy();
  await expect
    .poll(
      async () =>
        (
          await request.get('/api/v1/auth/me', { headers: bearer(session) })
        ).status(),
      {
        timeout: 10_000,
        intervals: [1_000],
      },
    )
    .toBe(401);
  const after = await signIn(newPassword);
  expect([401, 403], `deactivated sign-in ${after.status()}`).toContain(
    after.status(),
  );
});

/**
 * P2-AUTH-14: a successful sign-in resets the failed-attempt counter
 * (4 wrong, 1 right, 4 wrong, 1 right = 10 logins, a window of its own).
 */
test('P2-AUTH-14 success resets the failed-attempt counter', async ({
  request,
}) => {
  test.setTimeout(150_000);
  await freshLoginWindow();
  const wrongFour = async (round: number) => {
    for (let i = 1; i <= 4; i++) {
      const wrong = await attempt(
        request,
        'lockout',
        `wrong-${round}-${i}-${Date.now()}`,
      );
      expect(wrong.status(), `round ${round} wrong ${i}`).toBe(401);
    }
  };
  await wrongFour(1);
  const right = await attempt(request, 'lockout');
  expect(right.status(), await right.text()).toBe(200);
  await wrongFour(2);
  // Not locked: only 4 failures since the last success.
  const still = await attempt(request, 'lockout');
  expect(still.status(), await still.text()).toBe(200);
});

/**
 * Email-code flows read from the QA mailbox (mailbox.ts): P2-AUTH-17 reset,
 * P2-AUTH-18 OTP, P2-AUTH-19 + P2-TEN-01..04 self-signup. Fresh rate-limit
 * window; 3 logins.
 */
test('P2-AUTH-17/18/19 + P2-TEN-01..04 reset, OTP, self-signup by email code', async ({
  request,
  accounts,
}) => {
  test.setTimeout(170_000);
  await freshLoginWindow();
  const wrongCode = (code: string) => (code === '000000' ? '111111' : '000000');

  // P2-AUTH-17: reset by emailed code; the code works once; old password dies.
  const resetUser = credentials('reset');
  const unknown = await request.post('/api/v1/auth/reset-password', {
    data: {
      email: `nobody-${Date.now()}@qa.pingforce.test`,
      tenantCode: 'QA_ALPHA',
    },
  });
  const sinceReset = new Date();
  const asked = await request.post('/api/v1/auth/reset-password', {
    data: { email: resetUser.email, tenantCode: 'QA_ALPHA' },
  });
  expect(asked.status(), await asked.text()).toBe(200);
  // No account enumeration: unknown email gets the same answer.
  expect(unknown.status()).toBe(200);
  expect(await unknown.json()).toEqual(await asked.json());
  const resetCode = await codeSentTo(request, resetUser.email, sinceReset);
  const confirm = (otp: string, newPassword: string) =>
    request.post('/api/v1/auth/reset-password/confirm', {
      data: {
        email: resetUser.email,
        tenantCode: 'QA_ALPHA',
        otp,
        newPassword,
      },
    });
  const newPassword = strongPassword();
  expect(
    (await confirm(wrongCode(resetCode), newPassword)).status(),
    'wrong code',
  ).toBe(401);
  const confirmed = await confirm(resetCode, newPassword);
  expect(confirmed.status(), await confirmed.text()).toBe(200);
  expect(
    (await confirm(resetCode, strongPassword())).status(),
    'code reused',
  ).toBe(401);
  expect((await attempt(request, 'reset')).status(), 'old password').toBe(401);
  expect(
    (await attempt(request, 'reset', newPassword)).status(),
    'new password',
  ).toBe(200);

  // P2-AUTH-18: OTP for the signed-in employee; wrong, right, reused.
  const staff = bearer(accounts.employee);
  const sinceOtp = new Date();
  const otpAsked = await request.post('/api/v1/auth/otp/request', {
    headers: staff,
    data: { purpose: 'EMAIL_VERIFICATION' },
  });
  expect(otpAsked.status(), await otpAsked.text()).toBe(200);
  const otp = await codeSentTo(
    request,
    credentials('employee').email,
    sinceOtp,
  );
  const verify = (code: string) =>
    request.post('/api/v1/auth/otp/verify', {
      headers: staff,
      data: { purpose: 'EMAIL_VERIFICATION', otp: code },
    });
  expect((await verify(wrongCode(otp))).ok(), 'wrong OTP').toBeFalsy();
  const verified = await verify(otp);
  expect(verified.status(), await verified.text()).toBe(200);
  expect((await verify(otp)).ok(), 'OTP reused').toBeFalsy();

  // P2-TEN-01: no-card trial checkout, then the workspace.
  const plans = (await (
    await request.get('/api/v1/public/billing/plans')
  ).json()) as {
    code: string;
    trialDays: number;
  }[];
  const trial = plans.find((p) => p.trialDays > 0);
  expect(trial, 'a trial plan is published').toBeTruthy();
  const tagged = Math.random().toString(36).slice(2, 10);
  const adminEmail = `founder-${tagged}@qa.pingforce.test`;
  const checkout = await request.post('/api/v1/public/billing/checkout', {
    data: { planCode: trial!.code, customerEmail: adminEmail },
  });
  expect(checkout.status(), await checkout.text()).toBe(201);
  const { subscriptionId, trialEnd } = (await checkout.json()) as {
    subscriptionId: string;
    trialEnd: string;
  };
  // P2-TEN-03: trial ends trialDays from now (± a day).
  const days = (new Date(trialEnd).getTime() - Date.now()) / 86_400_000;
  expect(Math.round(days)).toBe(trial!.trialDays);
  // The public checkout no longer accepts a tenant to attach to.
  const hijack = await request.post('/api/v1/public/billing/checkout', {
    data: {
      planCode: trial!.code,
      customerEmail: adminEmail,
      tenantId: randomUUID(),
    },
  });
  expect(hijack.status(), 'tenantId refused').toBe(400);

  const adminPassword = strongPassword();
  const sinceSignup = new Date();
  const signup = await request.post('/api/v1/auth/register-tenant', {
    data: {
      subscriptionId,
      tenantName: `QA Signup ${tagged}`,
      adminEmail,
      adminPassword,
      adminFirstName: 'Founder',
      adminLastName: tagged,
    },
  });
  expect(signup.status(), await signup.text()).toBe(201);
  const { tenantCode } = (await signup.json()) as { tenantCode: string };
  // P2-TEN-02: the same subscription or email cannot make a second tenant.
  const again = await request.post('/api/v1/auth/register-tenant', {
    data: {
      subscriptionId,
      tenantName: `QA Again ${tagged}`,
      adminEmail,
      adminPassword,
    },
  });
  expect(again.status(), 'duplicate signup').toBe(400);

  // P2-AUTH-19: the workspace stays inactive until the emailed code is used.
  const signIn = () =>
    request.post('/api/v1/auth/login', {
      data: { email: adminEmail, password: adminPassword, tenantCode },
    });
  expect((await signIn()).ok(), 'sign-in before verification').toBeFalsy();
  const emailCode = await codeSentTo(request, adminEmail, sinceSignup);
  const verifyEmail = (otp: string) =>
    request.post('/api/v1/auth/verify-email', {
      data: { tenantCode, email: adminEmail, otp },
    });
  expect(
    (await verifyEmail(wrongCode(emailCode))).ok(),
    'wrong code',
  ).toBeFalsy();
  const activated = await verifyEmail(emailCode);
  expect(activated.status(), await activated.text()).toBe(200);

  // P2-TEN-04: the founder signs in to the new, separate workspace.
  const first = await signIn();
  expect(first.status(), await first.text()).toBe(200);
  const founder = (await first.json()) as Session;
  const me = await (
    await request.get('/api/v1/auth/me', { headers: bearer(founder) })
  ).json();
  expect(me.workspaceId).toBe(tenantCode);
  expect(me.roleCode).toBe('ADMIN_MANAGER');
  // Nothing of QA_ALPHA is visible to it.
  const employees = await request.get('/api/v1/employees', {
    headers: bearer(founder),
  });
  expect(await employees.text()).not.toContain('QA-EMPLOYEE');

  // P4-LD-10: a new tenant gets the default stages once, even when two tabs
  // open the board at the same moment.
  const stagesUrl = '/api/v1/leads/stages';
  const [tabA, tabB] = await Promise.all([
    request.get(stagesUrl, { headers: bearer(founder) }),
    request.get(stagesUrl, { headers: bearer(founder) }),
  ]);
  expect(tabA.status(), await tabA.text()).toBe(200);
  expect(tabB.status(), await tabB.text()).toBe(200);
  const stages = (await (
    await request.get(stagesUrl, { headers: bearer(founder) })
  ).json()) as { id: string; name: string }[];
  expect(stages.length, stages.map((s) => s.name).join(', ')).toBe(9);
  expect(new Set(stages.map((s) => s.name.toLowerCase())).size).toBe(9);

  // P4-LD-15: every stage but the last can be removed.
  for (const stage of stages.slice(1)) {
    const removed = await request.delete(`${stagesUrl}/${stage.id}`, {
      headers: bearer(founder),
    });
    expect(removed.ok(), await removed.text()).toBeTruthy();
  }
  const last = await request.delete(`${stagesUrl}/${stages[0].id}`, {
    headers: bearer(founder),
  });
  expect(last.status(), await last.text()).toBe(400);
});

/**
 * P2-AUTH-12 part 1: lock lockout2 (QA lockout is 1 minute, see
 * deploy/qa/compose.yml). The next case starts with a fresh-window wait,
 * which also outlasts the lock. 6 logins.
 */
test('P2-AUTH-12 lock a dedicated account (expiry checked next)', async ({
  request,
}) => {
  test.setTimeout(150_000);
  await freshLoginWindow();
  for (let i = 1; i <= 5; i++)
    expect(
      (await attempt(request, 'lockout2', `wrong-${i}-${Date.now()}`)).status(),
    ).toBe(401);
  const locked = await attempt(request, 'lockout2');
  expect(locked.status(), await locked.text()).toBe(403);
});

/**
 * P2-AUTH-12 part 2 + P2-WF-01/02: the lock has expired; a leave workflow
 * routes to its named approver only, and a delegate can act for them.
 * Fresh window; 2 logins.
 */
test('P2-AUTH-12 + P2-WF-01/02 lock expires; approval routing and delegation', async ({
  request,
  accounts,
}) => {
  test.setTimeout(170_000);
  await freshLoginWindow();
  // The 1-minute lock has passed: the right password works again.
  const expired = await attempt(request, 'lockout2');
  expect(expired.status(), await expired.text()).toBe(200);

  const admin = bearer(accounts.admin);
  const approverSession = await login(request, 'approver');
  const approver = bearer(approverSession);
  const approverId = (
    await (await request.get('/api/v1/auth/me', { headers: approver })).json()
  ).userId as string;
  const adminId = (
    await (await request.get('/api/v1/auth/me', { headers: admin })).json()
  ).userId as string;

  const code = `QA_WF_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const workflow = await request.post('/api/v1/workflows', {
    headers: admin,
    data: {
      code,
      name: 'QA leave approval',
      module: 'LEAVES',
      entityName: 'leave_request',
      active: true,
      stages: [
        {
          stageNumber: 1,
          stageName: 'Named approver',
          approverUserId: approverId,
          slaHours: 24,
        },
      ],
    },
  });
  expect(workflow.status(), await workflow.text()).toBe(201);
  const workflowId = (await workflow.json()).id as string;
  const staff = bearer(accounts.employee);
  const types = (await (
    await request.get('/api/v1/leaves/types', { headers: staff })
  ).json()) as { id: string; code: string }[];
  const typeId = types.find((t) => t.code === 'QA_ANNUAL')!.id;
  const requestLeave = async (day: string) => {
    const leave = await request.post('/api/v1/leaves/request', {
      headers: staff,
      data: {
        leaveTypeId: typeId,
        startDate: day,
        endDate: day,
        reason: 'QA workflow',
      },
    });
    expect(leave.status(), await leave.text()).toBe(201);
    return (await leave.json()).id as string;
  };
  const leaveIds: string[] = [];
  try {
    // P2-WF-01: only the named approver may decide.
    const first = await requestLeave(LEAVE_DAYS[40]);
    leaveIds.push(first);
    const byAdmin = await request.post(`/api/v1/leaves/${first}/approve`, {
      headers: admin,
      data: { reason: 'QA not my stage' },
    });
    expect(byAdmin.status(), await byAdmin.text()).toBe(403);
    const byApprover = await request.post(`/api/v1/leaves/${first}/approve`, {
      headers: approver,
      data: { reason: 'QA named approver' },
    });
    expect(byApprover.ok(), await byApprover.text()).toBeTruthy();
    expect((await byApprover.json()).status).toBe('APPROVED');

    // P2-WF-02: the approver delegates to the admin, who can then decide.
    const delegation = await request.post('/api/v1/workflows/delegations', {
      headers: admin,
      data: {
        delegatorUserId: approverId,
        delegateUserId: adminId,
        module: 'LEAVES',
        reason: 'QA holiday cover',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    expect(delegation.status(), await delegation.text()).toBe(201);
    const second = await requestLeave(LEAVE_DAYS[41]);
    leaveIds.push(second);
    const byDelegate = await request.post(`/api/v1/leaves/${second}/approve`, {
      headers: admin,
      data: { reason: 'QA as delegate' },
    });
    expect(byDelegate.ok(), await byDelegate.text()).toBeTruthy();
    expect((await byDelegate.json()).status).toBe('APPROVED');
    // Self-delegation is refused.
    const self = await request.post('/api/v1/workflows/delegations', {
      headers: admin,
      data: {
        delegatorUserId: adminId,
        delegateUserId: adminId,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    });
    expect(self.status()).toBe(400);
  } finally {
    await request.post(`/api/v1/workflows/${workflowId}/deactivate`, {
      headers: admin,
    });
    for (const id of leaveIds)
      await request.post(`/api/v1/leaves/${id}/cancel`, {
        headers: approver,
        data: { reason: 'QA clean up' },
      });
  }
});

/**
 * P2-TNT-01/02 Super Admin manages tenants: lists them (tenant admins
 * cannot), edits are whitelisted, suspending QA_BETA locks its users out
 * and reactivating restores them. Then P1-API-10 spends the rest of the
 * window to show the login limit trips while other routes keep working.
 * Fresh rate-limit window. Runs last: it suspends QA_BETA for a moment.
 */
test('P2-TNT-01/02 + P1-API-10 Super Admin tenant control, then the login limit', async ({
  request,
  accounts,
}) => {
  test.setTimeout(170_000);
  await freshLoginWindow();
  const superLogin = await request.post('/api/v1/auth/login', {
    data: {
      email: 'super@qa.pingforce.test',
      password: process.env.QA_TEST_PASSWORD,
      portalType: 'ADMIN_PORTAL',
    },
  });
  expect(superLogin.status(), await superLogin.text()).toBe(200);
  const platform = bearer((await superLogin.json()) as Session);

  // P2-TNT-01: the tenant list is platform-only.
  const tenants = await request.get('/api/v1/tenants', { headers: platform });
  expect(tenants.status(), await tenants.text()).toBe(200);
  const rows = (await tenants.json()) as
    | { id: string; code: string }[]
    | { items: { id: string; code: string }[] };
  const list = Array.isArray(rows) ? rows : rows.items;
  const beta = list.find((t) => t.code === 'QA_BETA');
  expect(beta, 'QA_BETA listed').toBeTruthy();
  expect(
    (
      await request.get('/api/v1/tenants', { headers: bearer(accounts.admin) })
    ).status(),
    'tenant admin',
  ).toBe(403);
  // Edits are whitelisted: an arbitrary column is refused.
  const sneaky = await request.patch(`/api/v1/tenants/${beta!.id}`, {
    headers: platform,
    data: { code: 'HIJACKED' },
  });
  expect(sneaky.status(), await sneaky.text()).toBe(400);

  // P2-TNT-02: suspend QA_BETA; its open session and new sign-ins stop.
  const setStatus = (status: string) =>
    request.patch(`/api/v1/tenants/${beta!.id}`, {
      headers: platform,
      data: { status },
    });
  try {
    expect((await setStatus('SUSPENDED')).ok()).toBeTruthy();
    await expect
      .poll(
        async () =>
          (
            await request.get('/api/v1/auth/me', {
              headers: bearer(accounts.other),
            })
          ).status(),
        { timeout: 10_000, intervals: [1_000] },
      )
      .toBe(401);
    const blocked = await request.post('/api/v1/auth/login', {
      data: credentials('admin', 'QA_BETA'),
    });
    expect(blocked.ok(), `suspended sign-in ${blocked.status()}`).toBeFalsy();
  } finally {
    expect((await setStatus('ACTIVE')).ok()).toBeTruthy();
  }
  await expect
    .poll(
      async () =>
        (
          await request.get('/api/v1/auth/me', {
            headers: bearer(accounts.other),
          })
        ).status(),
      { timeout: 10_000, intervals: [1_000] },
    )
    .toBe(200);

  // P1-API-10: keep failing sign-ins until the limit answers 429 (2 logins
  // spent above), while an unrelated route still answers.
  let throttled = false;
  for (let i = 0; i < 12 && !throttled; i++) {
    const wrong = await attempt(
      request,
      'restricted',
      `wrong-${i}-${Date.now()}`,
    );
    throttled = wrong.status() === 429;
  }
  expect(throttled, 'login limit reached').toBeTruthy();
  expect((await request.get('/api/v1/health')).status()).toBe(200);
  expect(
    (
      await request.get('/api/v1/auth/me', { headers: bearer(accounts.admin) })
    ).status(),
  ).toBe(200);
});
