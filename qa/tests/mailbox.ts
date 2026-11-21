import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * The QA stack's synthetic mailbox (Mailpit), proxied by the QA web server at
 * /__qa-mail/ (deploy/qa/Caddyfile). Nothing here can reach a real mailbox.
 */
const MAIL = '/__qa-mail/api/v1';

interface MessageSummary {
  readonly ID: string;
  readonly Subject: string;
  readonly Created: string;
}

/**
 * Waits for an email to `to`, sent after `since`, that carries a 6-digit
 * code, and returns the code. Mail without a code (an invite link sent just
 * before) is skipped rather than taken as "the newest", so a slow OTP mail
 * cannot be mistaken for the invite.
 */
export async function codeSentTo(
  request: APIRequestContext,
  to: string,
  since: Date,
): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await request.get(
          `${MAIL}/search?query=${encodeURIComponent(`to:"${to}"`)}`,
        );
        if (!search.ok()) return `mailbox HTTP ${search.status()}`;
        const { messages } = (await search.json()) as {
          messages: MessageSummary[];
        };
        const fresh = messages
          .filter(
            (m) => new Date(m.Created).getTime() >= since.getTime() - 1000,
          )
          .sort((a, b) => b.Created.localeCompare(a.Created));
        for (const summary of fresh) {
          const message = await request.get(`${MAIL}/message/${summary.ID}`);
          const { HTML } = (await message.json()) as { HTML: string };
          code = /\b(\d{6})\b/.exec(HTML.replace(/<[^>]+>/g, ' '))?.[1];
          if (code) return 'received';
        }
        return fresh.length ? 'mail without a code yet' : 'no mail yet';
      },
      { timeout: 20_000, intervals: [500, 1_000] },
    )
    .toBe('received');
  expect(code, `6-digit code in mail to ${to}`).toBeTruthy();
  return code!;
}

/** True when no email reached `to` after `since` (waits a few seconds). */
export async function noMailTo(
  request: APIRequestContext,
  to: string,
  since: Date,
): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 3_000));
  const search = await request.get(
    `${MAIL}/search?query=${encodeURIComponent(`to:"${to}"`)}`,
  );
  const { messages } = (await search.json()) as { messages: MessageSummary[] };
  return !messages.some(
    (m) => new Date(m.Created).getTime() >= since.getTime(),
  );
}

/** Sender address of the newest email to `to` sent after `since`. */
export async function senderOfLatestTo(
  request: APIRequestContext,
  to: string,
  since: Date,
): Promise<string> {
  let from = '';
  await expect
    .poll(
      async () => {
        const search = await request.get(
          `${MAIL}/search?query=${encodeURIComponent(`to:"${to}"`)}`,
        );
        const { messages } = (await search.json()) as {
          messages: (MessageSummary & { From: { Address: string } })[];
        };
        const fresh = messages
          .filter(
            (m) => new Date(m.Created).getTime() >= since.getTime() - 1000,
          )
          .sort((a, b) => b.Created.localeCompare(a.Created));
        if (!fresh.length) return 'no mail yet';
        from = fresh[0].From.Address;
        return 'received';
      },
      { timeout: 20_000, intervals: [500, 1_000] },
    )
    .toBe('received');
  return from;
}
