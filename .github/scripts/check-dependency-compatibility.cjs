const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let currentCheck = 'dependency imports';

async function main() {
  const root = path.resolve(__dirname, '../..');
  const prismaRequire = createRequire(require.resolve('@prisma/config'));
  const { deepmerge } = await import(
    pathToFileURL(prismaRequire.resolve('deepmerge-ts')).href
  );
  console.log('Patched merge dependency loaded.');
  currentCheck = 'plain and recursive object merging';

  // Prisma's C12 config loader uses this export for plain config objects.
  assert.deepEqual(
    deepmerge(
      { migrations: { path: 'prisma/migrations' } },
      { migrations: { seed: 'npx tsx prisma/seed.ts' } },
    ),
    {
      migrations: {
        path: 'prisma/migrations',
        seed: 'npx tsx prisma/seed.ts',
      },
    },
  );

  // Regression for the advisory: recursive inputs must not exhaust the stack.
  const left = {};
  left.self = left;
  const right = {};
  right.self = right;
  assert.doesNotThrow(() => deepmerge(left, right));
  console.log('Merge regression checks passed.');

  currentCheck = 'Prisma configuration loading';
  const { loadConfigFromFile } = require('@prisma/config');
  const loaded = await loadConfigFromFile({ configRoot: root });
  assert.equal(loaded.error, undefined, 'Prisma config must load successfully');
  assert.equal(loaded.config.schema, path.join(root, 'prisma/schema.prisma'));
  assert.equal(
    loaded.config.migrations.path,
    path.join(root, 'prisma/migrations'),
  );
  assert.equal(loaded.config.migrations.seed, 'npx tsx prisma/seed.ts');
  console.log('Prisma configuration loaded.');

  currentCheck = 'query parsing';
  const qs = require('qs');
  assert.deepEqual(qs.parse('filter[status]=OPEN'), {
    filter: { status: 'OPEN' },
  });
  assert.deepEqual(qs.parse('__proto__[dependencySmokePolluted]=true'), {});
  assert.equal({}.dependencySmokePolluted, undefined);

  // decode-uri-component is overridden to 0.5.1 (ESM-only) under minio's
  // query-string 7. Node 22 require(esm) hands query-string a namespace, so
  // only stringify is safe; minio must never start calling parse paths.
  currentCheck = 'minio query-string stringify';
  const minioRequire = createRequire(require.resolve('minio'));
  const minioQs = minioRequire('query-string');
  assert.equal(minioQs.stringify({ b: 1, a: 'x y' }), 'a=x%20y&b=1');
  const fs = require('node:fs');
  const minioDist = path.dirname(require.resolve('minio'));
  const parseCalls = fs
    .readdirSync(minioDist, { recursive: true })
    .filter((f) => String(f).endsWith('.js'))
    .filter((f) =>
      /(qs|querystring)\.(parse|parseUrl)\(/.test(
        fs.readFileSync(path.join(minioDist, String(f)), 'utf8'),
      ),
    );
  assert.deepEqual(parseCalls, [], 'minio now calls query-string parse');
  console.log('minio query-string usage is stringify-only.');

  console.log('Patched dependency compatibility checks passed.');
}

main().catch(() => {
  // Config parsing errors may embed environment values; keep CI output safe.
  console.error(
    `Patched dependency compatibility check failed: ${currentCheck}`,
  );
  process.exitCode = 1;
});
