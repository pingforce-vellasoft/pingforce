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
