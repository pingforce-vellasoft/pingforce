import type { APIRequestContext } from '@playwright/test';
import {
  test,
  expect,
  bearer,
  credentials,
  login,
  type Session,
} from './fixtures';

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
