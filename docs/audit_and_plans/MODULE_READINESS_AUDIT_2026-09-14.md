# Module Readiness Audit — 2026-09-14

This review compares the repository's Markdown specifications with the code,
schema, routes, and automated checks. Many specification documents use
“Complete” or “Production Ready” to describe documentation maturity; those
labels must not be treated as implementation or release evidence.

## Attendance

Decision: **feature-complete for the agreed MVP; not yet production-approved**.

Included scope:

- Online employee check-in/check-out with tenant and RBAC enforcement
- Assigned-geofence validation and tenant policy enforcement
- GPS accuracy, mock-location and optional biometric checks
- One bound handset per employee and admin-approved device replacement
- Per-install Ed25519 punch signatures, server verification and replay defense
- Transactional serialization of simultaneous punches
- Offline signed queue, ordered/idempotent replay and worked-minute credit
- Employee daily history and attendance correction submission
- Admin daily logs, manual adjustments and correction workflow
- Attendance audit events and tracking-gap support

Explicitly excluded by product decision:

- Shift scheduling/assignment
- Break start/stop and break policy

Verification evidence:

- Prisma Client generation: passed
- API TypeScript compile: passed
- Attendance API/unit tests: 7 suites, 46 tests passed
- Complete API tests: 38 suites, 333 tests passed
- Angular admin development build: passed
- Targeted Flutter analysis for attendance and device integration: no issues

Release gates still required by the repository Definition of Done:

- Deploy migration `20260914070000_attendance_punch_integrity`
- Run online/offline device E2E on Android/iOS with a real bound handset
- Run full CI, coverage, security and performance gates
- Product Owner/UAT approval

## Login, authentication, and attached features

Decision: **core login is implemented and its current automated suites pass,
but the overall auth experience is not release-complete**.

Verified working:

- Tenant/workspace-aware credential login and active-account checks
- Short-lived JWT access tokens and opaque rotating refresh tokens
- Refresh replay detection, token-version invalidation, session revoke/logout
- Password change/reset, OTP/email verification and login-history recording
- Mobile onboarding gates, role navigation and employee device-binding gate
- Single-flight mobile refresh handling and secure mobile token storage
- API auth/session/device tests: 5 suites, 53 tests passed

Required follow-ups:

1. Validate the JWT `sid` against the active session on protected requests, or
   document the accepted maximum revocation delay (currently the access-token
   lifetime, 15 minutes).
2. Replace the mobile login quick-biometric placeholder with a real credential
   unlock/refresh flow. The separate biometric screen currently only performs
   a local scan and navigation.
3. Remove the hard-coded `DEFAULT` workspace from Google sign-in and make the
   workspace explicit/resolved.
4. Preserve actionable mobile login failures; the repository currently maps
   network, locked, disabled and server errors to “Invalid email or password.”
5. Clear all auth-realm/session metadata on mobile logout.
6. Reconsider storing admin access and refresh tokens in `localStorage`; an
   HttpOnly/Secure/SameSite cookie strategy materially reduces XSS token theft.

Mobile test result: 63 tests passed and 1 navigation assertion failed because
the customer role now includes the newly added “My Complaints” destination
while the older test still expects Home only. This failure is outside attendance
but must be reconciled before claiming a green mobile suite.

## Recommended development order

1. **Finish Fault Management first.** It already has substantial uncommitted
   backend, admin, mobile, portal, notification, migration and test work in the
   current worktree. Stabilize and verify that work before opening another
   large module.
2. **Leave Management next.** A vertical slice exists, but it needs a focused
   correctness pass: cancellation/withdrawal, balance reservation semantics,
   cross-year/half-day/weekend/holiday rules, manager scope, DTO/query
   validation, notifications, tests and documentation reconciliation.
3. **Connection Map after Leave.** Map/admin/mobile foundations exist. Audit and
   finish employee-id scoping, topology integrity, edit/assignment flows,
   pagination/clustering for large tenants, offline behavior and map tests.

Before beginning the next module, close the attendance migration and device E2E
release gates and decide whether the six authentication follow-ups are blockers
for the intended pilot environment.
