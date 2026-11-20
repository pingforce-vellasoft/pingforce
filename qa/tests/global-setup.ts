import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { request, type FullConfig } from '@playwright/test';
import { login, SESSIONS_FILE, type Session } from './fixtures';

/**
 * Logs the shared QA accounts in ONCE per run and stores the tokens in the
 * git-ignored qa/.auth/ folder. Workers read them instead of logging in.
 *
 * Why: /auth/login allows 10 requests per minute per IP, and Playwright
 * replaces the worker after every failed test. Logging in per worker made
 * one failure cascade into a wall of 429s.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  const context = await request.newContext({ baseURL, maxRedirects: 0 });
  try {
    const sessions: Record<string, Session> = {};
    for (const role of ['admin', 'employee', 'restricted'])
      sessions[role] = await login(context, role);
    sessions.other = await login(context, 'admin', 'QA_BETA');
    mkdirSync(dirname(SESSIONS_FILE), { recursive: true });
    writeFileSync(SESSIONS_FILE, JSON.stringify(sessions), { mode: 0o600 });
  } finally {
    await context.dispose();
  }
}
