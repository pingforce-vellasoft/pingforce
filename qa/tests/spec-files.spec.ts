import { readdirSync } from 'node:fs';
import { test, expect } from '@playwright/test';

/**
 * Playwright silently skips a spec file no project matches (batch 1's
 * platform.spec.ts went unrun that way). Fail loudly instead.
 */
test('QA-000 every spec file belongs to a Playwright project', async ({}, testInfo) => {
  const patterns = testInfo.config.projects.flatMap((project) => {
    const match = project.testMatch;
    return Array.isArray(match) ? match : [match];
  });
  const unmatched = readdirSync(__dirname)
    .filter((file) => file.endsWith('.spec.ts'))
    .filter(
      (file) =>
        !patterns.some((pattern) =>
          pattern instanceof RegExp
            ? pattern.test(file)
            : typeof pattern === 'string' && file.includes(pattern),
        ),
    );
  expect(unmatched, 'spec files no project runs').toEqual([]);
});
