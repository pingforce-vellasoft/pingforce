import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cases = JSON.parse(readFileSync(new URL('./test-cases.json', import.meta.url), 'utf8'));
const ids = new Set();
const totals = {};
for (const item of cases) {
  if (ids.has(item.id)) throw new Error(`Duplicate case ${item.id}`);
  ids.add(item.id);
  for (const key of ['id', 'module', 'title', 'priority', 'requirement']) {
    if (!item[key]) throw new Error(`Missing ${key}: ${item.id}`);
  }
  for (const key of ['preconditions', 'steps', 'expected']) {
    if (!Array.isArray(item[key]) || !item[key].length) throw new Error(`Missing ${key}: ${item.id}`);
  }
  for (const path of [item.requirement, item.automation.file, item.relatedUnitSuite].filter(Boolean)) {
    if (!existsSync(resolve(path))) throw new Error(`Missing reference ${path}: ${item.id}`);
  }
  const status = item.automation.status;
  if (!['implemented-unverified', 'device-unverified', 'planned'].includes(status)) throw new Error(`Unknown status: ${status}`);
  if (status !== 'planned' && !item.automation.file) throw new Error(`Missing automation: ${item.id}`);
  totals[status] = (totals[status] ?? 0) + 1;
}
console.log(`${cases.length} traceable cases; automation inventory (not execution results):`);
console.table(totals);
// A strict release check intentionally fails while planned/device cases remain.
if (process.argv.includes('--release') && cases.some((item) => item.automation.status === 'planned' || item.automation.status === 'device-unverified')) {
  console.error('Release coverage incomplete; inspect test-cases.json. Execution reports and human UAT are also required.');
  process.exitCode = 1;
}
