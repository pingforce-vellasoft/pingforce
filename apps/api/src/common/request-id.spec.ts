import type { IncomingMessage } from 'node:http';
import { resolveRequestId } from './request-id';

const req = (header?: string): IncomingMessage & { requestId?: string } =>
  ({
    headers: header === undefined ? {} : { 'x-request-id': header },
  }) as IncomingMessage & { requestId?: string };

const res = () => {
  const headers: Record<string, string> = {};
  return {
    headersSent: false,
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    headers,
  };
};

describe('resolveRequestId', () => {
  it('creates one id and reuses it on every later call', () => {
    const request = req();
    const response = res();
    const first = resolveRequestId(request, response as never);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId(request)).toBe(first);
    expect(response.headers['x-request-id']).toBe(first);
  });

  it('keeps a plain client-supplied id', () => {
    expect(resolveRequestId(req('client-123.abc:9'))).toBe('client-123.abc:9');
  });

  it.each(['bad id with spaces', 'x'.repeat(129), 'line\nbreak', ''])(
    'replaces an unsafe client id %#',
    (header) => {
      const id = resolveRequestId(req(header));
      expect(id).not.toBe(header);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    },
  );

  it('does not set the header once the response is sent', () => {
    const response = { ...res(), headersSent: true };
    resolveRequestId(req(), response as never);
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});
