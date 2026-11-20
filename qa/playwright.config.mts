import { defineConfig } from '@playwright/test';
import { assertQaOrigin } from './lib/safety.mjs';

const baseURL = assertQaOrigin(
  process.env.QA_BASE_URL ?? 'http://127.0.0.1:4300',
);
export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  outputDir: '../artifacts/qa/results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/qa/html', open: 'never' }],
    ['junit', { outputFile: 'artifacts/qa/junit.xml' }],
  ],
  // Authentication payloads contain secrets: do not capture traces or video.
  use: { baseURL, trace: 'off', video: 'off', screenshot: 'only-on-failure' },
  projects: [
    { name: 'api', testMatch: /api\.spec\.ts/ },
    {
      name: 'chromium',
      testMatch: /web\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
  ],
});
