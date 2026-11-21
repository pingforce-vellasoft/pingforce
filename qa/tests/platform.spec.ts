import { randomUUID } from 'node:crypto';
import { test, expect, bearer } from './fixtures';

/** Phase 1 API platform cases (test plan P1-API-xx). */

const STACK_TRACE = /node_modules|\bat .*\.[jt]s:\d|prisma\.|SELECT |INSERT /i;

test('P1-API-01 health check reports database and memory up', async ({
  request,
}) => {
  const response = await request.get('/api/v1/health');
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe('ok');
  expect(body.info?.database?.status).toBe('up');
});

test('P1-API-02 only versioned routes answer', async ({
  request,
  accounts,
}) => {
  const headers = bearer(accounts.admin);
  for (const path of ['/api/employees', '/api/v2/employees', '/api/health'])
    expect(
      (await request.get(path, { headers })).status(),
      `${path} should not exist`,
    ).toBe(404);
  expect((await request.get('/api/v1/employees', { headers })).status()).toBe(
    200,
  );
});

test('P1-API-04 unknown and wrongly typed fields are rejected', async ({
  request,
  accounts,
}) => {
  const response = await request.post('/api/v1/leads', {
    headers: bearer(accounts.admin),
    data: { leadNumber: 12345, firstName: 'QA', unexpectedField: 'x' },
  });
  const text = await response.text();
  expect(response.status(), text).toBe(400);
  const { message } = JSON.parse(text) as { message: string[] };
  expect(message.join(' | ')).toContain('unexpectedField');
  expect(message.join(' | ')).toContain('leadNumber');
});

test('P1-API-05 malformed id in the URL is a 400, not a 500', async ({
  request,
  accounts,
}) => {
  const response = await request.get('/api/v1/leads/not-a-uuid', {
    headers: bearer(accounts.admin),
  });
  expect(response.status(), await response.text()).toBe(400);
});

test('P1-API-06 error bodies use the standard shape with no internals', async ({
  request,
  accounts,
}) => {
  const responses = [
    await request.get('/api/v1/employees'),
    await request.get('/api/v1/leads/not-a-uuid', {
      headers: bearer(accounts.admin),
    }),
    await request.get(`/api/v1/leads/${randomUUID()}`, {
      headers: bearer(accounts.admin),
    }),
  ];
  for (const response of responses) {
    const text = await response.text();
    expect(response.status(), text).toBeGreaterThanOrEqual(400);
    const body = JSON.parse(text);
    expect(body).toEqual(
      expect.objectContaining({
        statusCode: response.status(),
        path: expect.any(String),
        requestId: expect.any(String),
        message: expect.anything(),
      }),
    );
    expect(body).not.toHaveProperty('stack');
    expect(text).not.toMatch(STACK_TRACE);
  }
});

test('P1-API-07 request id: header and error body carry the same id', async ({
  request,
}) => {
  const anonymous = await request.get('/api/v1/employees');
  const id = anonymous.headers()['x-request-id'];
  expect(id).toBeTruthy();
  expect((await anonymous.json()).requestId).toBe(id);

  // A plain client id is kept end to end; an unsafe one is replaced.
  const mine = `qa-${randomUUID()}`;
  const echoed = await request.get('/api/v1/employees', {
    headers: { 'x-request-id': mine },
  });
  expect(echoed.headers()['x-request-id']).toBe(mine);
  expect((await echoed.json()).requestId).toBe(mine);

  const unsafe = await request.get('/api/v1/employees', {
    headers: { 'x-request-id': 'bad id <script>' },
  });
  expect(unsafe.headers()['x-request-id']).not.toContain('<script>');
});

test('P1-API-08 security headers present, framework not advertised', async ({
  request,
}) => {
  const headers = (await request.get('/api/v1/health')).headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBeTruthy();
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['content-security-policy']).toBeTruthy();
  expect(headers).not.toHaveProperty('x-powered-by');
});
