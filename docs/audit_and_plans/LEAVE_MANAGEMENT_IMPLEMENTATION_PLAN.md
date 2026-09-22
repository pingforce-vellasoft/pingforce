# Leave Management — Completion Plan

> **Module:** Leave Management
> **Status:** Core implementation and targeted verification done; release gates pending
> **Branch:** `feature/leave-management`
> **Prepared:** 2026-09-20
> **Next queued module:** Connection Map

## Implementation checkpoint — 2026-09-21

The current branch implements reservation accounting, immutable balance movements,
stored chargeable days, half-day/calendar calculation, date/query validation,
scoped reads, transactional workflow decisions, withdrawal and approved
cancellation, admin review/paging, and mobile preview/withdrawal/paging.

Targeted verification passed: 79 backend tests, 5 admin service tests, and 4
Flutter model tests. Leave service/calendar coverage reached 98.28% statements
and 92.24% branches. Leave-only Dart analysis, Angular template parsing, Prisma
client generation, and whitespace checks passed. These checks do not replace
database integration tests or production sign-off.

See `apps/api/src/leave/README.md` for the API contract and migration procedure.
The migration has not been applied to a live database. Calendar-day behavior is
preserved for unconfigured tenants; configured weekends/holidays are excluded.
Cross-year applications require separate requests. Status/duration use validated
string values rather than a PostgreSQL enum migration for compatibility.

Remaining before release: database-backed migration/concurrency verification,
CI regression/builds on a capable runner, real-device UAT, and Product Owner
approval. Per the user's explicit laptop constraint, full test suites and full
frontend/backend builds must not be run locally. Role-only workflow notification
broadcasting, a calendar-policy editor, and per-type calendar overrides are not
included in this slice; scoped approval queues remain available.

## 1. Why Leave Is Next

The current module-readiness plan orders the remaining business-module work as:

1. Finish Fault Management.
2. Complete Leave Management.
3. Complete Connection Map.

Fault Management was completed in commit `6f84a63`. Leave therefore remains the
next planned module. Connection Map stays immediately after Leave and should use
its own `feature/connection-map` branch.

The existing Leave implementation is a useful vertical slice, not a completed
module. It already includes Prisma models, authenticated API endpoints, workflow
approval integration, an Angular approval screen, a Flutter employee screen,
email/in-app decision notifications, and a small service test suite.

## 2. Completion Objective

Deliver a tenant-isolated, RBAC-scoped leave lifecycle in which employees can
request and withdraw leave, managers can review requests within their data scope,
and balances remain correct through concurrent requests, multi-stage decisions,
cancellation, and calendar edge cases.

## 3. Decisions to Lock Before Schema Work

These decisions affect persistence and calculation rules and must be recorded in
the module documentation before implementation:

- **Balance timing:** reserve entitlement when a request is submitted; convert the
  reservation to used entitlement only on final approval; release it on rejection
  or withdrawal.
- **Day units:** support whole and half days with an explicit duration field; do
  not infer half days from timestamps because the schema stores calendar dates.
- **Calendar rules:** calculate chargeable days using tenant weekends and holiday
  calendars. Define whether each leave type counts or excludes those dates.
- **Year boundaries:** split one request into yearly balance allocations, or reject
  cross-year requests with a clear validation error for the first release. The
  selected behavior must not charge all days to the start year.
- **Cancellation:** employees may withdraw pending requests. Cancellation of an
  approved request requires scoped manager approval and a balance reversal policy.
- **Approver identity:** store the approver employee ID consistently; the JWT user
  ID must be resolved before writing `approvedBy`.

Recommended first-release choices are reservation on submission, explicit
whole/half-day duration, exclusion of configured non-working days, rejection of
cross-year requests with a specific error, employee withdrawal while pending,
and manager-controlled cancellation after approval.

## 4. Workstreams

### 4.1 Domain and database

- Add typed request status and duration enums instead of free-form strings.
- Track requested, reserved, and used day quantities explicitly.
- Add decision, withdrawal, and cancellation timestamps/reasons.
- Add a balance-ledger or allocation model so every debit and credit is auditable
  and idempotent.
- Add tenant-scoped indexes for manager queues and employee history.
- Preserve mandatory audit columns and soft-delete behavior on all business rows.
- Create a Prisma migration and update seed/test fixtures.

### 4.2 Backend architecture and correctness

- Refactor to the required `Controller -> Service -> Repository -> Prisma` layers.
- Add DTOs for list queries, decisions, withdrawal, and cancellation; validate
  UUIDs, status values, pagination, years, reasons, and date ordering.
- Remove or secure `GET /leaves/balance/:employeeId`; self-service balance reads
  must derive the employee from the JWT, while manager reads require scoped RBAC.
- Implement one calendar calculation service used by submission, approval,
  rejection, withdrawal, and cancellation.
- Make balance reservation and request creation one serializable, retry-safe
  transaction to prevent concurrent overbooking.
- Enforce tenant, soft-delete, employee ownership, manager scope, and self-approval
  checks on every read and mutation.
- Make final workflow decisions idempotent and record `approvedAt`, actor identity,
  request ID, and audit history.
- Dispatch notifications after the transaction commits; notification failure must
  not roll back a valid leave decision.
- Add explicit return types to controllers, services, and repositories.

### 4.3 Admin portal

- Move all API access into a leave service and keep the page presentational.
- Add validated filters, pagination, loading/empty/error states, and request detail.
- Show chargeable days, duration, balance impact, workflow stage, and decision
  history before approval or rejection.
- Require a reason where policy requires one and prevent duplicate submissions.
- Verify route visibility and actions against RBAC and data scope.

### 4.4 Mobile app

- Keep Riverpod state and datasource/repository boundaries.
- Add whole/half-day selection and display the server-calculated chargeable days.
- Add pending-request withdrawal and clear status/history presentation.
- Queue only product-approved offline actions; otherwise show an explicit online
  requirement rather than implying a request was submitted.
- Refresh balances and history after every successful lifecycle change.
- Preserve actionable validation and network errors.

### 4.5 Notifications and audit

- Notify the next approver when a request is submitted or advances a workflow
  stage.
- Notify the employee on final approval, rejection, withdrawal, and cancellation.
- Use tenant templates and deep links for email, push, and in-app channels.
- Record append-only audit events for submission and every state transition with
  `tenant_id`, `user_id`, and `request_id`.

## 5. Test Plan

### Backend unit and integration tests

- Date ordering, overlap, half-day, weekend, holiday, leap-year, and year-boundary
  calculations.
- Insufficient balance and two concurrent requests competing for one balance.
- Reservation, approval, rejection, withdrawal, cancellation, and repeated-command
  idempotency.
- Tenant isolation, soft-deleted rows, OWN/TEAM/ALL manager scope, and self-approval
  denial.
- Multi-stage workflow behavior and correct approver employee identity.
- Notification failure after a committed decision.

### API E2E tests

- Employee submit/list/balance/withdraw lifecycle.
- Manager scoped queue and approve/reject lifecycle.
- Cross-tenant IDs return not found or forbidden without leaking existence.
- Invalid query, enum, UUID, pagination, and date inputs return validation errors.
- Audit events and balance ledger entries match every mutation.

### Client tests

- Angular component/service tests for filtering, pagination, permissions, duplicate
  click protection, and decision errors.
- Flutter notifier/widget tests for apply, withdraw, refresh, offline behavior, and
  server validation messages.
- One admin/mobile end-to-end happy path and one rejection/withdrawal path.

Coverage target is at least 90% for Leave business logic, followed by the full API,
admin, and mobile regression suites.

## 6. Delivery Sequence

1. Confirm policy decisions and reconcile Leave documentation.
2. Add schema, migration, ledger/allocation behavior, and seed data.
3. Add repository layer, validated DTOs, calendar calculation, and lifecycle rules.
4. Complete workflow, RBAC/data-scope, audit, and notifications.
5. Complete Angular manager experience.
6. Complete Flutter employee experience.
7. Run unit, integration, E2E, tenant-isolation, security, and performance checks.
8. Update module state/changelog and obtain Product Owner/UAT approval.

## 7. Definition of Done

- All leave queries and mutations are tenant-scoped and soft-delete aware.
- Employees cannot access or mutate another employee's leave data.
- Managers can act only within their RBAC data scope and cannot self-approve.
- Balances remain correct for concurrent and repeated requests and every terminal
  state has an auditable compensating entry.
- Calendar, half-day, and year-boundary behavior matches the approved policy.
- DTO validation covers every body, path, and query input.
- API, admin, and mobile tests pass with 90%+ Leave business-logic coverage.
- Documentation, migration/deployment notes, security review, and UAT evidence are
  complete.
- Product Owner approval is recorded before merge.

## 8. Connection Map Handoff

After Leave reaches the Definition of Done, create `feature/connection-map` from
the latest `main`. Start from the existing Connection Map BRD and implementation
plan, then focus its completion audit on employee scoping, topology integrity,
edit/assignment flows, large-tenant clustering/pagination, offline behavior, and
map tests as identified by the readiness audit.
