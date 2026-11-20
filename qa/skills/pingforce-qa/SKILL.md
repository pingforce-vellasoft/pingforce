---
name: pingforce-qa
description: Maintain PingForce requirement-linked QA cases and run its local API, Angular and Flutter regression automation. Use for QA changes or regression analysis in this repository.
---

Read `qa/TEST-PLAN.md` and the relevant entries in `qa/test-cases.json` from the repository root. For a changed feature, compare its Markdown requirements, controllers/DTOs, services/repositories, Angular forms and Flutter datasources/screens. Use the current readiness audit to resolve scope; the older roadmap alone does not make every planned feature an MVP requirement.

Keep case IDs stable. Record preconditions, specific steps, expected outcomes, requirement paths and executable paths. Tests derived from code must also check intended requirements; a missing requirement is a gap, not a passing test. An existing related unit suite does not establish full journey coverage. `implemented-unverified` means code exists, not that it passed. Keep run results in `artifacts/qa/`, separate from coverage inventory.

Run `npm run qa:safety`, `npm run qa:catalogue`, `npx tsc -p qa/tsconfig.json` and `npm run qa:e2e -- --list` for test infrastructure changes. Run affected Jest/Flutter suites and executable journeys when their dependencies are available. Report unexecuted tests explicitly, including the missing prerequisite. Do not weaken assertions, bypass device signatures/RBAC, or silently skip unavailable fixtures to produce green reports.

Use the dedicated local stack in `deploy/qa/compose.yml`. Do not load a workspace `.env` into fixtures. Keep target validation in `qa/lib/safety.mjs` and redirects disabled for credential requests. Seed only through `qa/seed.ts` with the guarded QA database identity. Use UUIDs for mutable records and restore reversible test state in finally blocks. Do not hard-delete business records or reset existing user passwords to make repeat runs pass.

For Flutter, build with `--dart-define=PINGFORCE_ENV=qa`; verify Android package `com.vellasoft.pingforce.qa` before running Maestro. Inspect the rendered semantics before changing selectors. Real GPS, biometric and offline/device-binding results require a device run; an API mock is not equivalent. Keep production Firebase out of QA builds.

Hosting is deferred by the user. Local automation authorization does not authorize production database cloning, deployment or shared-server reconfiguration. `deploy/qa/README.md` records the future isolation requirements.
