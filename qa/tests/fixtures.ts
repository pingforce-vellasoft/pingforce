import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test as base, expect, APIRequestContext } from '@playwright/test';

/** Written by global-setup.ts; git-ignored (qa/.auth/). */
export const SESSIONS_FILE = join(__dirname, '..', '.auth', 'sessions.json');

export interface Session {
  accessToken: string;
  refreshToken: string;
}
export const credentials = (role: string, tenantCode = 'QA_ALPHA') => ({
  email: `${role}@qa.pingforce.test`,
  password: process.env.QA_TEST_PASSWORD ?? '',
  tenantCode,
});

export async function login(
  request: APIRequestContext,
  role: string,
  tenant = 'QA_ALPHA',
): Promise<Session> {
  if (!process.env.QA_TEST_PASSWORD)
    throw new Error('QA_TEST_PASSWORD is required');
  const response = await request.post('/api/v1/auth/login', {
    data: credentials(role, tenant),
    maxRedirects: 0,
  });
  // The message carries the API's answer (no secrets: error bodies only).
  expect(
    response.status(),
    `login ${role}@${tenant}: ${await response.text()}`,
  ).toBe(200);
  const session: Session = await response.json();
  expect(session.accessToken).toBeTruthy();
  expect(session.refreshToken).toBeTruthy();
  return session;
}

export const bearer = (session: Session) => ({
  Authorization: `Bearer ${session.accessToken}`,
});

// Shared sessions come from global-setup.ts (one login per account per run),
// so a worker restart after a failed test costs no extra logins.
export const test = base.extend<object, { accounts: Record<string, Session> }>({
  accounts: [
    async ({}, use) => {
      const accounts = JSON.parse(
        readFileSync(SESSIONS_FILE, 'utf8'),
      ) as Record<string, Session>;
      await use(accounts);
    },
    { scope: 'worker' },
  ],
});
export { expect };
