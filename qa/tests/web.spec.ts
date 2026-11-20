import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  // Also prevents a accidentally production-built admin from sending credentials to live APIs.
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin)
      return route.abort('blockedbyclient');
    await route.continue();
  });
});

test('WEB-AUTH-001 protected route redirects to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole('button', { name: 'Sign In', exact: true }),
  ).toBeDisabled();
});

test('WEB-AUTH-002 admin credential login reaches dashboard', async ({
  page,
}) => {
  if (!process.env.QA_TEST_PASSWORD)
    throw new Error('QA_TEST_PASSWORD is required');
  await page.goto('/login');
  await page.getByLabel('Workspace ID (Tenant)').fill('QA_ALPHA');
  await page.getByLabel('Email or Username').fill('admin@qa.pingforce.test');
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.QA_TEST_PASSWORD);
  const response = page.waitForResponse((r) =>
    r.url().endsWith('/api/v1/auth/login'),
  );
  // After login the page loads the profile; if /auth/me fails it clears the
  // session and the guard sends the user back to /login. Capture it.
  const profile = page.waitForResponse((r) =>
    r.url().endsWith('/api/v1/auth/me'),
  );
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  expect((await response).status()).toBe(200);
  const me = await profile;
  expect(me.status(), `/auth/me: ${await me.text()}`).toBe(200);
  await expect(page).toHaveURL(/\/dashboard/);
});
