# Cross-Phase Gap Review (Phases 0–6)

**Date:** 2026-07-15
**Scope:** Full codebase reviewed against phase claims + docs/ specs. Excludes the
already-known frontend-heavy Phase 6 remainders (visits/reports screens, workflow
UI, scheduled/custom reports + Excel/PDF export, richer org-hierarchy entities).

**Build health (verified this review):**

- `nx build api` — ✅ compiles
- `nx build admin` — ✅ compiles
- `flutter analyze` — ✅ No issues found
- `prisma validate` — ✅ valid; migrations cover all 57 mapped tables (no drift)

Legend: 🔴 blocker · 🟠 correctness/security · 🟡 completeness · 🟢 verified-good

---

## A. Verified GOOD (claims hold up in code)

- 🟢 **RBAC coverage** — every business controller has `RbacGuard`; the only
  guard-less controllers are auth (public by design, per-route JwtAuthGuard),
  and files/settings (both are **empty shells — no endpoints**, zero risk).
- 🟢 **Reports raw SQL** — every `$queryRaw` filters `tenantId` AND `deletedAt IS
NULL`; leads/faults/visits aggregates correctly tenant-scoped.
- 🟢 **Offline sync idempotency** — attendance/faults/leads sync services dedupe
  (signature/±60s window; faultNumber; leadNumber) — retried uploads safe.
- 🟢 **State machines** — attendance + visit FSMs reject invalid transitions (409).
- 🟢 **Money = Decimal**, opaque hashed refresh tokens, soft-delete extension,
  $transaction on punch/device/roles — all present as claimed (Phase 3).
- 🟢 **CSV export** — RFC-4180 quote-escaping present, 10k row cap, audited.

---

## B. GAPS — security / correctness (should fix before production)

### B1. 🟠 Data-scope enforced on approval queues ONLY

`getDataScope`/`buildEmployeeScopeFilter` exist and are applied in leave, claims,
and attendance-correction **pending queues**. But the primary **list endpoints
ignore scope entirely**:

- `GET /faults`, `GET /leads`, `GET /employees`, `GET /attendance/logs`,
  `GET /visits`, and all `/reports/*` return **every tenant row**.
- Effect: a TEAM-scoped manager (or SELF-scoped employee) sees the whole tenant's
  data. DataScope.md §1 requires scope on "every query, report, dashboard, API,
  export." This is the single biggest correctness gap.
- Fix: thread the scope filter into faults/leads/employee/visit repositories and
  the reports service (was flagged "Phase 3 leftover" but never done).

### B2. 🟠 CSV formula injection not neutralized

`reports-export.service.ts:212` quotes cells containing `" , \n \r` but a cell
starting with `= + - @` is written raw → Excel/Sheets executes it as a formula
(CSV injection / CWE-1236). A lead named `=cmd|...` exfiltrates on open.

- Fix: prefix a `'` (or space) to any cell whose first char is `= + - @ \t \r`.

### B3. 🟠 Notification templates never seeded → all business emails silently drop

Handlers send `VISIT_ASSIGNED`, `VISIT_COMPLETED`, `VISIT_REJECTED`,
`LEAD_CONVERTED`, `FAULT_ESCALATED`, `FAULT_RESOLVED` via
`notificationsService.sendEmail(tenant, recipient, TEMPLATE_NAME, …)`.
`sendEmail` **no-ops when the tenant has no matching `NotificationTemplate` row**,
and `seed.ts` creates **zero templates**. So every Phase 4/6 notification is dead
on a fresh deploy — the wiring is real but nothing is delivered.

- Fix: seed the standard templates per tenant (or a platform-default fallback in
  `sendEmail`). Cheap, high-impact.

### B4. 🟠 `/api/v1/uploads` still served statically

`ServeStaticModule` exposes `uploads/` at `/api/v1/uploads` with **no auth guard**
(ServeStatic bypasses Nest guards). Original audit flagged this; still open.
Any file written there is world-readable to anyone with the URL. Low severity
today (files module is an empty shell — nothing writes there yet) but it's a
latent hole the moment file upload lands.

---

## C. GAPS — completeness (deferred features, not yet built)

### C1. 🟡 Test coverage ≈ 0 vs DoD 90%

Only 4 `.spec.ts` files exist — all trivial lib stubs
(`dto.spec`, `enums.spec`, `interfaces.spec`, `shared.spec`). **No service,
controller, guard, or state-machine tests.** DEFINITION_OF_DONE.md mandates 90%
business-logic coverage. Highest-value targets: RBAC guard/data-scope, auth
(refresh rotation/replay), attendance + visit state machines, approval engine,
offline-sync idempotency.

### C2. 🟡 Phase 2b never delivered (external-credential blocked)

- **FCM push** — DeviceToken model exists, unused; no firebase/fcm code anywhere.
- **OCI Object Storage** — files still metadata-only; no real byte storage.
- **Login-history table + self-service endpoint** — never built (approximated by
  AuditLog LOGIN events only).
- **Per-tenant email providers** — single global SMTP transport only.

### C3. 🟡 Data-scope levels incomplete

Only OWN/TEAM/BRANCH/ALL implemented. DataScope.md §4 also lists
DEPARTMENT/REGION/BUSINESS_UNIT/CUSTOM; TEAM only covers **direct** reports (no
indirect-report hierarchy walk).

### C4. 🟡 Workflow engine is single-stage

`ApprovalsService` does single-stage RBAC+scope+self-approval-block. ApprovalWorkflow.md
wants multi-level sequential/parallel/conditional routing, delegation, SLA on
approvals — none of that yet (leave/claims/corrections work fine single-stage).

### C5. 🟡 Attendance correction workflow simplified

Correction FSM in spec is DRAFT→SUBMITTED→UNDER_MANAGER_REVIEW→UNDER_HR_REVIEW→
APPROVED→APPLIED; implementation collapses to PENDING→APPROVED/REJECTED (single
approver). Functional but not the multi-tier review the spec describes.

### C6. 🟡 Audit trail — no export/retention/archive/hash-chain

AuditLogs.md §7/§10/§12/§13 (retention policies, archive tables, monthly
partitioning, WORM/hash-chain integrity, export API) not implemented. Core
append-only logging + search works.

---

## D. Deploy blockers (operational, not code)

- 🔴 **All 6 migrations are hand-written and UNAPPLIED** (local DB creds invalid,
  P1000). Before any deploy: `prisma migrate deploy` against a real DB, then
  `prisma db seed`. Untested against a live Postgres — the hand-written SQL
  (esp. Decimal `USING ::numeric` casts, backfills, Phase 6 tables) needs a
  staging dry-run.
- 🔴 **Seed must set** `SEED_SUPER_ADMIN_PASSWORD` env or no admin account is
  created. Add notification-template seeding here too (B3).
- 🟠 Existing JWTs invalidate on deploy (iss/aud claims + opaque refresh switch)
  → all users re-login once. Expected, communicate it.

---

## E. Recommended fix order (fast, high-impact first)

1. **B3** seed notification templates — ~30 min, unblocks all email delivery.
2. **B2** CSV formula-injection guard — ~10 min, one function.
3. **B1** data-scope on faults/leads/employee/visit/reports lists — ~half day,
   the real correctness win.
4. **C1** tests for the security-critical paths (RBAC, auth rotation, state
   machines, approval self-block, sync idempotency) — highest DoD gap.
5. **B4** move uploads behind a guarded controller when file upload is built.
6. Everything in C2–C6 / audit hardening = scheduled later phases (many blocked
   on OCI/Firebase creds).

Nothing here regresses the green build state; these are additive fixes.

---

## F. Fix log (2026-07-16)

- ✅ **B3** — default templates for all 6 business emails in
  `apps/api/src/notifications/default-templates.ts`; seeded per tenant in
  `prisma/seed.ts` (backfill) and on tenant provisioning
  (`TenantsService.create`, `AuthService.registerTenant`). Idempotent
  (createMany + skipDuplicates keeps tenant-customised rows).
- ✅ **B2** — `toCsv` escape now prefixes `'` to any cell starting with
  `= + - @ \t \r` (CWE-1236); covered by `reports-export.service.spec.ts`.
- ✅ **B1** — data scope enforced on all primary lists + reports/exports:
  `RbacService.resolveScopeIds` (OWN/TEAM/BRANCH/ALL → id sets, deny by
  default) + `employeeScopeWhere`/`userScopeWhere` builders. Applied to
  `GET /faults` + `/faults/breached` (assignee/creator), `GET /leads` +
  `/leads/pipeline` (owner/creator), `GET /employees`, `GET /attendance/logs`,
  `GET /visits` (assigned employee/creator), all `/reports/*` (incl. scoped
  KPI cache keys) and `/reports/export` (DataScope.md §14).
- ✅ **B4** — `ServeStaticModule` removed; downloads stream through guarded
  `GET /api/v1/files/:id/download` (JWT + tenant check + path-traversal guard).
- ✅ **C1 (first tranche)** — 8 spec suites / 52 tests in `apps/api`
  (jest target added): visit + attendance FSMs, `RbacService`
  permission/data-scope resolution, `RbacGuard`, approval engine
  (self-approval block, TEAM scoping), refresh-token rotation + replay
  detection, offline punch sync idempotency, CSV export hardening.
  Remaining toward the 90% DoD: controller/e2e coverage, leave/claims/
  corrections services, sync services for faults/leads/visits.
