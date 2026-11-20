import { test as base, expect, APIRequestContext } from '@playwright/test';

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
  expect(response.status()).toBe(200);
  const session: Session = await response.json();
  expect(session.accessToken).toBeTruthy();
  expect(session.refreshToken).toBeTruthy();
  return session;
}

export const bearer = (session: Session) => ({
  Authorization: `Bearer ${session.accessToken}`,
});

export const test = base.extend<object, { accounts: Record<string, Session> }>({
  accounts: [
    async ({ playwright }, use, workerInfo) => {
      const baseURL = workerInfo.project.use.baseURL;
      const request = await playwright.request.newContext({
        baseURL,
        maxRedirects: 0,
      });
      const accounts: Record<string, Session> = {};
      for (const role of ['admin', 'employee', 'restricted'])
        accounts[role] = await login(request, role);
      accounts.other = await login(request, 'admin', 'QA_BETA');
      await use(accounts);
      for (const account of Object.values(accounts)) {
        await request.post('/api/v1/auth/logout', { headers: bearer(account) });
      }
      await request.dispose();
    },
    { scope: 'worker' },
  ],
});
export { expect };
