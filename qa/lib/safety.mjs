const allowedOrigins = new Set([
  'https://qa.pingforce.com',
  'http://127.0.0.1:4300',
  'http://localhost:4300',
]);

export function assertQaOrigin(value) {
  const url = new URL(value);
  if (!allowedOrigins.has(url.origin) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('QA target must be https://qa.pingforce.com or local port 4300');
  }
  return url.origin;
}

export function assertQaDatabase(env) {
  if (env.PINGFORCE_ENV !== 'qa') throw new Error('PINGFORCE_ENV must be qa');
  const url = new URL(env.DATABASE_URL ?? '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['qa-postgres', '127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/pingforce_qa' || url.username !== 'pingforce_qa') {
    throw new Error('Only the dedicated pingforce_qa database/user is permitted');
  }
  if ([...url.searchParams.keys()].some((key) => key !== 'schema') ||
      (url.searchParams.has('schema') && url.searchParams.get('schema') !== 'public')) {
    throw new Error('Unexpected QA database connection options');
  }
}
