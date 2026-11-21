import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Client-supplied ids are reused only when they look like an id. */
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;

type RequestWithId = IncomingMessage & { requestId?: string };

/**
 * Returns the request's correlation id, creating it on first use.
 *
 * The pino-http logger, RequestIdMiddleware and the exception filters all
 * call this, whichever runs first, so the `x-request-id` response header, the
 * log line and the error body's `requestId` always carry the same value.
 * A client may send its own `x-request-id`; anything that is not a short,
 * plain id is replaced, so it cannot inject text into the logs.
 */
export function resolveRequestId(
  req: RequestWithId,
  res?: Pick<ServerResponse, 'setHeader' | 'headersSent'>,
): string {
  if (!req.requestId) {
    const header = req.headers['x-request-id'];
    const sent = Array.isArray(header) ? header[0] : header;
    req.requestId = sent && SAFE_ID.test(sent) ? sent : randomUUID();
  }
  if (res && !res.headersSent) res.setHeader('x-request-id', req.requestId);
  return req.requestId;
}
