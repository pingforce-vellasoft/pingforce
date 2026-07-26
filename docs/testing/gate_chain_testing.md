# Testing the mobile gate chain

How to validate the post-login gate chain end to end without a Play Store
listing, and without hand-editing the database between runs.

## The chain

Evaluated in `RouteGuard.resolve` ([app_shell.dart](../../apps/mobile/lib/core/navigation/app_shell.dart)).
Order matters — first match wins.

| #      | Gate                  | Fires when                            | Sends to                 | Cleared by                        |
| ------ | --------------------- | ------------------------------------- | ------------------------ | --------------------------------- |
| 1      | Auth                  | `!authed` on a non-auth route         | `/auth/login`            | `signIn()`                        |
| 1      | Reverse-auth          | `authed` on an auth route             | `/home`                  | —                                 |
| 1b     | Force password change | `mustChangePassword`                  | `/auth/change-password`  | `force_change_password_screen.dart:67` |
| 1c     | Profile setup         | `!isOnboarded`                        | `/auth/profile-setup`    | `profile_setup_screen.dart:186`   |
| 1c-bis | Device binding        | `isOnboarded && !deviceBound`         | `/auth/device-binding`   | `device_binding_screen.dart:62`   |
| 1d     | Permissions           | `…&& deviceBound && !permsSeen`       | `/permissions`           | `permissions_flow_screen.dart:309` |
| 5      | RBAC                  | role lacks route permission           | `/home`                  | —                                 |

## Why a real device alone is not enough

The chain is one-way. Each screen clears its own flag and the account never
returns to that state, so an onboarded, device-bound employee cannot re-enter
it. Worse, device binding is one-handset-per-employee and only an admin can
move it — so a single test run *burns* the test account against that handset.

That is why "install the APK and look" can only ever validate the gates once,
in one order, on one device. The three layers below cover the rest.

## Layer 1 — unit tests (CI, no device)

[`apps/mobile/test/navigation/route_guard_test.dart`](../../apps/mobile/test/navigation/route_guard_test.dart)

```bash
cd apps/mobile && flutter test test/navigation/route_guard_test.dart
```

Asserts the ordering directly: which gate wins when several conditions hold at
once, and that no gate fires on its own screen (the redirect-loop class of bug
that shipped in `bacc751` and `3d0e8d6`). Covers the RBAC/`/home` interaction
and walks the full chain end to end as one account.

This is the cheapest place to catch ordering regressions, and the only place
that catches them before an APK is built.

## Layer 2 — server-side reset (replay the chain on a real handset)

Non-production only. Rewinds one account so the chain replays.

### Enabling

The module is mounted only when **both** hold:

```bash
NODE_ENV=development        # or 'test'
ALLOW_TEST_RESET_ENDPOINT=true
```

Outside those, `TestingModule` is never imported and the routes do not exist.
`TestingService` re-checks at call time as a backstop for a misconfigured
deploy.

### Constraints

- **Super admin only.** Deliberately not an RBAC permission — a tenant
  permission would be grantable to a tenant role, and no tenant role should be
  able to clear another account's forced-password flag or unbind the handset
  their attendance is pinned to.
- **The account email must contain `gatetest`.** Guards against a mistyped
  address destroying a real employee's profile and binding.

### The two test accounts

[`prisma/seed-gate-test.ts`](../../prisma/seed-gate-test.ts) provisions both,
idempotently. It needs an existing tenant and the system roles from the main
seed.

```bash
NODE_ENV=development ALLOW_TEST_RESET_ENDPOINT=true \
GATE_TEST_TENANT_CODE=ACME \
GATE_TEST_PASSWORD='TestPass123!' \
npm run seed:gate-test
```

| | Account A — walks the chain | Account B — gate 5 |
| --- | --- | --- |
| Email | `gatetest@pingforce.test` | `gatetest-rbac@pingforce.test` |
| Password | `$GATE_TEST_PASSWORD` | `$GATE_TEST_PASSWORD` |
| Tenant code | `$GATE_TEST_TENANT_CODE` | same |
| Role | `EMPLOYEE_FIELD_STAFF` | `EMPLOYEE_FIELD_STAFF` |
| Employee record | yes | no |
| Starting state | gates 1b, 1c, 1c-bis armed | chain clear, lands on `/home` |

Two accounts because gate 5 needs a role *lacking* a route's permission, and
the account walking 1→1d is mid-chain — it never reaches a route where RBAC
applies. Account B starts past every gate so a deep link exercises RBAC alone.

Account A **must** own an `Employee` record: the API reports non-employee
logins as already device-bound, so gate 1c-bis would never fire without one.

Re-running the script rewinds both accounts, so it doubles as an offline reset
when the API is not running.

### Rewinding

```bash
curl -X POST https://<api>/api/v1/testing/reset-gate-chain \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
        "tenantCode": "ACME",
        "email": "gatetest@pingforce.test",
        "password": "TestPass123!"
      }'
```

Re-arms gates 1b, 1c and 1c-bis by default; `resetPasswordChange`,
`resetProfile` and `resetDeviceBinding` opt individual gates out. Bumps
`tokenVersion` and revokes live sessions, so the handset is pushed back to
login rather than resuming mid-chain on stale cached flags.

Check state without changing it:

```bash
curl "https://<api>/api/v1/testing/gate-chain?tenantCode=ACME&email=gatetest@pingforce.test" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"
```

### What it cannot reset

`permissionsFlowSeen` is **device-local** (secure storage) by design — a
reinstall re-runs the flow. No server call clears it. Use the debug panel
below, or clear app storage.

## Layer 3 — on-device debug panel

Debug builds only. Long-press the logo on the login screen.

Shows every gate flag, plus the redirect the guard would issue right now — i.e.
the gate the app is parked on. Without it, a stall is invisible on a release
APK: gate screens issue no API calls, and there is no `flutter logs` to read
the `[RouteGuard]` diagnostics from.

The **Re-arm permissions gate** button clears `permissionsFlowSeen` — the one
flag the server reset cannot reach.

`GateDebugPanel.show` is a no-op when `kDebugMode` is false, so the panel cannot
be opened in a release build.

## The loop

1. Reset account A — the curl above, or re-run `npm run seed:gate-test`.
2. Clear app storage, or use the debug panel to re-arm the permissions gate.
3. Log in as `gatetest@pingforce.test` and walk: change password → profile
   setup → device binding → permissions → home.
4. Repeat.

Minutes per cycle, and the same account is reusable indefinitely.

For gate 5, log in as `gatetest-rbac@pingforce.test` and deep-link to
`/reports` — a field employee carries no `reports.view`, so it should bounce to
`/home`.

## Production safety

The reset endpoint undoes authentication state, including the anti-buddy-punching
device binding. Before any production deploy, confirm:

- `ALLOW_TEST_RESET_ENDPOINT` is unset (or not `true`), **and**
- `NODE_ENV=production`

Either alone is sufficient to keep the routes unmounted. Every reset is audited
as a `HIGH` severity `TESTING/GATE_CHAIN_RESET` event.
