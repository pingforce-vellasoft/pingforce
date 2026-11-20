import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertQaOrigin, assertQaDatabase } from './safety.mjs';

test('allows only exact QA origins', () => {
  assert.equal(
    assertQaOrigin('https://qa.pingforce.com'),
    'https://qa.pingforce.com',
  );
  assert.equal(
    assertQaOrigin('http://localhost:4300'),
    'http://localhost:4300',
  );
  for (const url of [
    'https://admin.pingforce.in',
    'https://api.pingforce.in',
    'https://qa.pingforce.com.evil.test',
    'http://qa.pingforce.com',
    'https://qa.pingforce.com/api',
    'https://user@qa.pingforce.com',
    'https://qa.pingforce.com?redirect=production',
  ]) {
    assert.throws(() => assertQaOrigin(url));
  }
});

test('rejects live databases, alternate users and connection overrides', () => {
  const env = {
    PINGFORCE_ENV: 'qa',
    DATABASE_URL:
      'postgresql://pingforce_qa:example@qa-postgres:5432/pingforce_qa?schema=public',
  };
  assert.doesNotThrow(() => assertQaDatabase(env));
  for (const patch of [
    { PINGFORCE_ENV: 'production' },
    { DATABASE_URL: env.DATABASE_URL.replace('qa-postgres', 'production') },
    { DATABASE_URL: env.DATABASE_URL.replace('/pingforce_qa', '/pingforce') },
    { DATABASE_URL: env.DATABASE_URL.replace('pingforce_qa:', 'postgres:') },
    { DATABASE_URL: env.DATABASE_URL + '&host=production' },
  ]) {
    assert.throws(() => assertQaDatabase({ ...env, ...patch }));
  }
});
