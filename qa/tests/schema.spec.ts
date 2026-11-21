import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * P1-DB-05: every business table carries tenantId, and it is indexed.
 * Static check of prisma/schema.prisma, so a new model that forgets tenant
 * scoping fails CI before any query is written against it.
 */

/** Models that legitimately have no tenantId column. */
const NO_TENANT: Record<string, string> = {
  Tenant: 'the tenant itself',
  SuperAdmin: 'platform operator',
  Permission: 'platform-wide permission catalogue',
  PlatformSetting: 'platform settings',
  Plan: 'platform billing plans',
  WebhookEvent: 'payment gateway events, before a tenant is known',
  UserProfile: 'child of User (1:1), scoped through userId',
  RolePermission: 'child of Role, scoped through roleId',
  DeviceToken: 'child of User, scoped through userId',
};

const schema = readFileSync(
  join(__dirname, '..', '..', 'prisma', 'schema.prisma'),
  'utf8',
);
const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)].map(
  ([, name, body]) => ({ name, body }),
);

test('P1-DB-05 every business model has an indexed tenantId', () => {
  expect(models.length).toBeGreaterThan(50);
  const missing: string[] = [];
  const unindexed: string[] = [];
  for (const { name, body } of models) {
    const tenantField = /^\s+tenantId\s+String\b(.*)$/m.exec(body);
    if (!tenantField) {
      if (!NO_TENANT[name]) missing.push(name);
      continue;
    }
    const attrs = tenantField[1];
    const leading = [
      ...body.matchAll(/@@(?:index|unique|id)\(\[([^\]]*)\]/g),
    ].map((m) => m[1].split(',')[0].trim());
    if (!/@id|@unique/.test(attrs) && !leading.includes('tenantId'))
      unindexed.push(name);
  }
  expect(
    missing,
    'models without tenantId (add it, or allowlist with a reason)',
  ).toEqual([]);
  expect(unindexed, 'models whose tenantId leads no index').toEqual([]);
  // The allowlist must not go stale either.
  const names = new Set(models.map((m) => m.name));
  expect(Object.keys(NO_TENANT).filter((n) => !names.has(n))).toEqual([]);
});
