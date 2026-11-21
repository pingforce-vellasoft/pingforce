import { defineConfig } from '@playwright/test';
import { assertQaOrigin } from './lib/safety.mjs';

const baseURL = assertQaOrigin(
  process.env.QA_BASE_URL ?? 'http://127.0.0.1:4300',
);
export default defineConfig({
  testDir: './tests',
  // One login per shared account per run (login is limited to 10/min/IP).
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  outputDir: '../artifacts/qa/results',
  reporter: [
    ['list'],
    // In CI, failures also become check annotations, readable without
    // downloading the report artifact.
    ...(process.env.CI ? [['github'] as ['github']] : []),
    ['html', { outputFolder: 'artifacts/qa/html', open: 'never' }],
    ['junit', { outputFile: 'artifacts/qa/junit.xml' }],
  ],
  // Authentication payloads contain secrets: do not capture traces or video.
  use: { baseURL, trace: 'off', video: 'off', screenshot: 'only-on-failure' },
  projects: [
    // Every spec file must belong to a project, or it silently never runs
    // (tests/spec-files.spec.ts fails the run if one is left out).
    {
      name: 'api',
      testMatch: [
        /api\.spec\.ts/,
        /platform\.spec\.ts/,
        /tenant-isolation\.spec\.ts/,
        /leave\.spec\.ts/,
        /visits\.spec\.ts/,
        /faults\.spec\.ts/,
        /geofence\.spec\.ts/,
        /tracking\.spec\.ts/,
        /spec-files\.spec\.ts/,
      ],
    },
    {
      name: 'chromium',
      testMatch: /web\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
    // Login-heavy cases (lockout, sessions). /auth/login allows 10 requests
    // per minute per client IP, so these run alone, after the other
    // projects, and wait for a fresh rate-limit window first.
    {
      name: 'auth-limits',
      testMatch: /auth-limits\.spec\.ts/,
      dependencies: ['api', 'chromium'],
      timeout: 180_000,
    },
  ],
});
