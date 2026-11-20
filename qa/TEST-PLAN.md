# PingForce QA automation

Branch: `codex/qa-automation`. Current focus: local automation. Hosting and DNS are deferred by product decision on 2026-09-22.

## Scope and evidence

The requirement-linked catalogue is [test-cases.json](test-cases.json). It covers authentication, authorization, attendance, leaves, faults, platform dependencies and the other modules identified in the roadmap. Each case has preconditions, steps, expected results, a requirement source and an automation status. Grouped parameterized tests produce several executions per case ID.

The September readiness audit takes precedence over the broad roadmap for attendance MVP: shift scheduling and breaks are excluded. Connection Map is the next module after Leave; its cases are tracked as planned. Billing/payroll, claims, leads, visits, reports and customer portal are regression scope for their implemented portions, not a claim that all their specifications are implemented.

Use `npm run qa:catalogue` to validate references and list gaps. `node qa/catalogue.mjs --release` refuses incomplete coverage. Even a complete inventory is not proof of a passing release: execution reports, agreed coverage thresholds and UAT remain necessary. No human approval is inferred from a green test.

## Open-source tools

- Jest: existing backend unit/domain suites, including attendance signatures, replay, leave reservations, fault state and tenant/RBAC logic.
- Playwright: real HTTP API tests plus Angular browser journeys; HTML/JUnit reports. [API testing documentation](https://playwright.dev/docs/api-testing).
- Flutter test: existing unit/widget suites.
- Maestro: checked-in Android login flows; device validation still required. [Flutter semantics documentation](https://docs.maestro.dev/get-started/supported-platform/flutter).

Schemathesis, load tests, accessibility scans and real-device services can be added after deterministic fixtures and core journeys pass. They are not installed or claimed as active coverage. No paid platform is required for the current setup.

## Local commands

From the repository root, after `npm ci`:

```text
npm run qa:safety
npm run qa:catalogue
npx tsc -p qa/tsconfig.json
npm run qa:e2e -- --list
npx jest --config apps/api/jest.config.cts --runInBand --coverage
npx vitest run --config apps/admin/leave.vitest.config.mts
```

To execute live HTTP/browser tests, start Docker Desktop with Linux containers. Create ignored `deploy/qa/.env` using the keys in `.env.example`, with separate random URL-safe values of at least 16 characters. Keep credentials out of terminal history and Git. Then:

```text
docker compose --env-file deploy/qa/.env -f deploy/qa/compose.yml up -d --build
npx playwright install chromium
```

Wait until `http://127.0.0.1:4300/api/docs-json` responds. Supply `QA_TEST_PASSWORD` to the test process through your local secret manager, using the same value as the seed. `QA_BASE_URL` defaults to `http://127.0.0.1:4300`. Run `npm run qa:e2e`. Do not use the older starter e2e command as the QA gate.

Fixtures provision QA_ALPHA and QA_BETA, each with `admin@qa.pingforce.test`, `employee@qa.pingforce.test` and `restricted@qa.pingforce.test`. The seed preserves existing accounts and balances on reruns. Employees have a linked employee record and annual leave allocation; admins are back-office accounts without device binding. The restricted role has no grants. No super-admin or live user is required.

Run the suite serially against a dedicated stack: concurrent jobs sharing fixture accounts can revoke each other's sessions, hit login throttles or collide on leave dates. Each CI run creates its own stack. Authentication deliberately retains application throttling; a fast manual rerun may need a one-minute cooldown. Fault tests retain synthetic records with unique IDs; leave withdrawal restores the reservation in a finally block. Investigate abandoned reservations after interrupted runs rather than wiping the database.

Stop with the same explicit Compose file and `down`; omit `--volumes` to preserve local QA history. No QA command mounts a production volume.

## Mobile

```text
cd apps/mobile
flutter pub get
flutter test --coverage
flutter build apk --debug --dart-define=PINGFORCE_ENV=qa
```

The APK uses package `com.vellasoft.pingforce.qa`, display name `PingForce QA`, and the QA URL. It can coexist with the production APK. Production Firebase initialization is disabled for QA; push delivery remains a gap until separate QA Firebase resources are provisioned. Current QA package isolation is Android-only; an iOS QA bundle/signing configuration remains planned.

For fully local Android execution, build with `flutter build apk --debug --dart-define=PINGFORCE_ENV=qa --dart-define=QA_API_URL=http://127.0.0.1:4300`, then run `adb reverse tcp:4300 tcp:4300` and install the debug APK. QA permits this local HTTP origin; production remains HTTPS. Production URLs cannot be passed as a QA override. Validate Maestro selectors on an emulator, supply `QA_TEST_PASSWORD` through its environment and run `maestro test qa/maestro` from the repository root. Flows are currently device-unverified. GPS, biometrics, offline synchronization and replacement-handset cases need additional flows and real-device evidence.

## CI and result interpretation

`.github/workflows/qa.yml` runs safety/catalogue/type checks, backend and targeted Angular tests, an isolated Compose deployment, API/browser regression, and Flutter tests. Reports are retained seven days and may contain synthetic user details; access follows repository artifact permissions. Authentication traces/video are disabled to avoid recording tokens/passwords.

`.github/workflows/qa-mobile.yml` is manual and produces the separate QA Android APK after Flutter tests. It does not claim Maestro device coverage. Existing production workflow deployment triggers are unchanged; do not dispatch the production CI workflow to deploy QA.

Known requirements to close: OTP/password-reset journeys; live refresh replay; broader tenant ID tampering; signed attendance/device/GPS E2E; leave approve/cancel/concurrency; full fault lifecycle/SLA/attachments; all planned supporting-module journeys; performance targets and 90% business-logic coverage measurement. Catalogue status deliberately exposes these gaps. Full automation is not yet complete.

For future QA work, read [the project skill](skills/pingforce-qa/SKILL.md). This is a versioned skill source; it is not installed into a user's global skill directory automatically.
