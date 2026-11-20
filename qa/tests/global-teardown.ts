import { existsSync, readFileSync, rmSync } from 'node:fs';
import { request, type FullConfig } from '@playwright/test';
import { bearer, SESSIONS_FILE, type Session } from './fixtures';

/** Logs the shared sessions out and deletes the stored tokens. */
export default async function globalTeardown(
  config: FullConfig,
): Promise<void> {
  if (!existsSync(SESSIONS_FILE)) return;
  const sessions = JSON.parse(readFileSync(SESSIONS_FILE, 'utf8')) as Record<
    string,
    Session
  >;
  const baseURL = config.projects[0]?.use.baseURL;
  const context = await request.newContext({ baseURL, maxRedirects: 0 });
  try {
    for (const session of Object.values(sessions)) {
      await context.post('/api/v1/auth/logout', { headers: bearer(session) });
    }
  } finally {
    await context.dispose();
    rmSync(SESSIONS_FILE, { force: true });
  }
}
