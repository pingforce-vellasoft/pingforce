import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = new URL('../deploy/qa/.env', import.meta.url);
const action = process.argv[2];
if (action === 'init') {
  try {
    writeFileSync(
      envFile,
      `QA_DB_PASSWORD=${randomBytes(24).toString('hex')}\nQA_TEST_PASSWORD=${randomBytes(24).toString('hex')}\n`,
      { flag: 'wx', mode: 0o600 },
    );
    console.log(
      'Created ignored local QA credentials. Existing credentials are never overwritten.',
    );
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log('Existing local QA credentials retained.');
  }
} else if (['up', 'down', 'test'].includes(action)) {
  const entries = readFileSync(envFile, 'utf8')
    .trim()
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('='));
  if (
    entries.some(
      ([key, value, extra]) =>
        !['QA_DB_PASSWORD', 'QA_TEST_PASSWORD'].includes(key) ||
        !/^[A-Za-z0-9_-]{16,}$/.test(value ?? '') ||
        extra !== undefined,
    )
  ) {
    throw new Error(
      'QA .env must contain only URL-safe QA_DB_PASSWORD and QA_TEST_PASSWORD values',
    );
  }
  const secrets = Object.fromEntries(entries);
  if (!secrets.QA_DB_PASSWORD || !secrets.QA_TEST_PASSWORD)
    throw new Error('Missing QA credentials');
  const compose = [
    'compose',
    '--env-file',
    'deploy/qa/.env',
    '-f',
    'deploy/qa/compose.yml',
  ];
  const result =
    action === 'test'
      ? spawnSync(
          process.execPath,
          [
            'node_modules/@playwright/test/cli.js',
            'test',
            '--config',
            'qa/playwright.config.mts',
            ...process.argv.slice(3),
          ],
          {
            cwd: root,
            stdio: 'inherit',
            env: {
              ...process.env,
              QA_BASE_URL: 'http://127.0.0.1:4300',
              QA_TEST_PASSWORD: secrets.QA_TEST_PASSWORD,
            },
          },
        )
      : spawnSync(
          'docker',
          [
            ...compose,
            ...(action === 'up' ? ['up', '-d', '--build'] : ['down']),
          ],
          {
            cwd: root,
            stdio: 'inherit',
            env: { ...process.env, ...secrets },
          },
        );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} else {
  throw new Error('Usage: node qa/local.mjs init|up|test|down');
}
