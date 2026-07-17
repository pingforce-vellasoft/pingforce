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

- ✅ ~~🔴 **All 6 migrations are hand-written and UNAPPLIED**~~ — **staging
  dry-run PASSED 2026-07-16** (see §F below). All 10 migrations apply cleanly
  on `postgis/postgis:16-3.4-alpine` (the prod compose image); data backfills
  verified against populated tables. Remaining prod step is just
  `docker compose run --rm migrate` per GO_LIVE_PLAYBOOK Step 5. Note: plain
  `postgres:16` FAILS — `init_auth` requires the PostGIS extension.
- ✅ ~~🔴 **Seed must set** `SEED_SUPER_ADMIN_PASSWORD`~~ — seed dry-run PASSED
  (see §F). Warns-and-skips admin creation when unset (no crash); creates
  `super_admins` row when set; notification-template seeding (B3) confirmed
  in the same run. Idempotent on re-run.
- 🟠 Existing JWTs invalidate on deploy (iss/aud claims + opaque refresh switch)
  → all users re-login once. Expected, communicate it — announcement note added
  to GO_LIVE_PLAYBOOK Step 5.

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
- ✅ **C2 (Phase 2b)** — all four deferred items delivered
  (migration `20260716150000_phase2b_login_history_email_storage`; suite now
  12 suites / 78 tests):
  - **FCM push** — `PushService` (firebase-admin, env-gated via
    `FIREBASE_SERVICE_ACCOUNT_PATH`/`_JSON`, simulated when unset), stale
    token pruning, `POST/DELETE /notifications/device-tokens` lifecycle,
    dedicated `notifications-push` queue.
  - **Login history (LoginHistory.md)** — `login_history` table +
    `LoginHistoryService`; fire-and-forget records on every login branch
    (SUCCESS, UNKNOWN_ACCOUNT, INVALID_PASSWORD, ACCOUNT_INACTIVE,
    PORTAL_RESTRICTED, Google auth) + TOKEN_REPLAY on refresh; logoutAt
    stamped via session revoke; self-service `GET /auth/login-history`.
  - **Per-tenant email providers (Email.md §5)** — `tenant_email_configs`
    table, SMTP passwords sealed AES-256-GCM under
    `EMAIL_CONFIG_ENCRYPTION_KEY`, per-tenant transporter cache with global
    SMTP fallback, `GET/PUT/DELETE /notifications/email-config` behind new
    `NOTIFICATIONS:MANAGE` permission (catalog + seed backfill).
  - **File storage (Upload.md/Storage.md)** — `StorageService` env-gated:
    S3-compatible object storage via minio client (local MinIO dev / OCI
    Object Storage S3-compat endpoint) when `OBJECT_STORAGE_ENDPOINT` set,
    local `uploads/` otherwise; `POST /files/upload` with extension+MIME
    allowlist, per-category size caps, SHA-256 checksum, tenant-prefixed
    keys; download streams any provider; delete removes physical bytes.
- ✅ **C3** — full DataScope.md §4 level set (suite now 12 suites / 87 tests;
  migration `20260716180000_c3_data_scope_levels`):
  - **Levels** — `RbacService` now resolves OWN / CUSTOM / TEAM / DEPARTMENT /
    BRANCH / REGION / BUSINESS_UNIT / ALL (rank order for multi-action
    grants); unknown stored levels deny by default.
  - **TEAM hierarchy walk** — direct **and indirect** reports via cycle-safe
    BFS over `reportingManagerId` (depth cap 10, DataScope.md §8).
  - **Org units** — `regions` + `business_units` masters (exposed through
    `/master-data/regions|business-units`), `employees.regionId/
businessUnitId`; DEPARTMENT/REGION/BUSINESS_UNIT scope = members of the
    caller's unit, deny when unassigned.
  - **CUSTOM (§12)** — `user_scope_overrides` table (per-user rules targeting
    EMPLOYEE/TEAM/DEPARTMENT/BRANCH/REGION/BUSINESS_UNIT, optional module +
    validity window), managed via `GET/POST/DELETE /rbac/scope-overrides`
    (ROLES:READ/UPDATE); resolution unions caller + rule targets.
  - **Approval engine** — scope check generalized from direct-reports-only to
    membership in the actor's resolved scope (all levels, deny on NONE).
  - **Role grants** — `PUT /rbac/roles/:id/permissions` accepts optional
    per-permission `grants[{permissionId, dataScope}]` (previously everything
    reset to OWN).
- ✅ **C4** — multi-stage workflow engine (ApprovalWorkflow.md; migration
  `20260716210000_c4c5c6_workflow_engine_audit_hardening`; suite now
  14 suites / 109 tests):
  - **Definitions (§7/§8)** — `workflow_definitions` + `workflow_stages`
    (SEQUENTIAL / PARALLEL with `minimumApprovals`, per-stage
    `requiredAction`, static user/role approver constraints, `slaHours`),
    managed via `GET/POST/PUT/DELETE /workflows` +
    `/:id/activate|deactivate` behind new `WORKFLOWS:READ/MANAGE`
    permissions. Stage numbering validated contiguous; stage replacement
    blocked while instances are in flight.
  - **Runtime (§6/§10/§19)** — `workflow_instances` + immutable
    `workflow_actions`; `ApprovalsService.process` is engine-aware: tenants
    with an active definition for (module, entityName) route through stages
    (the module state change runs only on the finalizing decision —
    rejection at any stage, or final-stage approval); tenants without one
    keep the original single-stage path (zero regression — leave, claims,
    corrections unchanged by default). One vote per approver per stage;
    every stage action audited; instance history at
    `GET /workflows/instances/:id/history`.
  - **Conditional routing (§11)** — `conditions` JSON rules
    (`eq/neq/gt/gte/lt/lte/in`) evaluated against decision context (claims
    pass `amount`/`expenseCategoryId`, leave passes `leaveTypeId`/`days`);
    malformed rules fail closed; conditional definitions win over
    unconditional fallbacks.
  - **Delegation (§13)** — time-boxed `workflow_delegations`
    (optionally module-scoped) via `GET/POST/DELETE /workflows/delegations`;
    delegates act with the delegator's RBAC+scope authority, recorded as
    `actedAsDelegateOf`; self-approval block still applies to the actor.
  - **SLA (§12)** — per-stage `slaDueAt`; 15-min cron flags overdue
    instances (`escalatedAt`) and audits `WORKFLOW_ESCALATED` (MEDIUM).
- ✅ **C5** — attendance correction multi-tier review
  (ATTENDANCE_CORRECTION.md §7/§8): corrections ride the C4 engine —
  configuring an active `attendance_correction` workflow moves requests
  through `PENDING → UNDER_MANAGER_REVIEW → UNDER_HR_REVIEW →
UNDER_EMPLOYER_REVIEW`; final approval sets `APPROVED` and, when the
  session was actually updated, `APPLIED` (spec FSM APPROVED → APPLIED).
  Employees can withdraw open requests via
  `POST /attendance/corrections/:id/cancel` (→ `CANCELLED`, engine instance
  cancelled). Duplicate check + approver queue now cover all open review
  statuses. No configured workflow = single-approver flow as before.
- ✅ **C6** — audit hardening (AuditLogs.md §7/§10/§12/§13/§16):
  - **Hash chain (§10)** — every audit write carries a gapless per-tenant
    `sequence` + SHA-256 `chainHash` over (prevHash + canonical payload),
    advanced via optimistic claim on `audit_chain_heads` in the same
    transaction (contention falls back to an unchained write rather than
    dropping the event). Canonical JSON (recursively sorted keys) keeps
    hashes stable across jsonb round-trips. `GET /audit/integrity`
    recomputes the chain (AUD-006: content tamper, splice, sequence gap).
  - **Export (§13/§16)** — `GET /audit/export` (new `AUDIT:EXPORT`
    permission) streams CSV (10k cap, CWE-1236 formula guard), records
    `audit_exports` and audits `AUDIT_EXPORTED`.
  - **Retention/archive (§7/§12)** — per-tenant `audit_retention_policies`
    (`GET/PUT /audit/retention`, new `AUDIT:MANAGE`); nightly 01:30 sweep
    moves rows past `archiveAfterDays` into `audit_archive` (searchable via
    `?includeArchived=true`, exports included) and purges archives past
    `retentionDays`. Retention is opt-in per tenant.
  - **Deferred** — monthly partitioning and WORM object storage remain
    future work (need raw DDL/OCI setup; hash chain covers integrity
    meanwhile). BigInt sequences serialize as strings via a `toJSON`
    shim in `main.ts`.
- ✅ **D (deploy blockers) — staging dry-run 2026-07-16**, disposable Docker
  Postgres matching prod image (`postgis/postgis:16-3.4-alpine`):
  - **Migrations** — all 10 apply cleanly via `prisma migrate deploy` on a
    fresh DB (74 tables, 10/10 finished in `_prisma_migrations`). Confirmed
    plain `postgres:16` fails (`init_auth` needs PostGIS) — prod compose
    already uses the postgis image, so no change needed.
  - **Data backfills** — second pass applied migrations ≤ phase2 first,
    inserted populated rows (tenant, employee, device, salary structure,
    payslip, expense claim with fractional float money), then applied the
    remaining 7: Float→`DECIMAL(12,2)` `USING ::numeric` casts round
    correctly (45123.4567→45123.46 etc.), `employee_devices.tenantId`
    backfilled from owning employee before `SET NOT NULL`.
  - **Drift check** — `prisma migrate diff` DB↔schema shows only expected
    noise: GiST indexes on `geography` columns (unrepresentable in Prisma)
    and SQL-side `DEFAULT now()` on `updatedAt` (client-managed `@updatedAt`).
  - **Seed** — with `SEED_SUPER_ADMIN_PASSWORD`: 81 permissions upserted,
    `super_admins` row created (argon2 hash), all 6 default notification
    templates backfilled for existing tenants (B3); without the env var it
    warns and skips (no crash). Re-run idempotent.
  - Remaining for go-live: run GO_LIVE_PLAYBOOK Step 5 against the live OCI
    DB and announce the one-time forced re-login (JWT iss/aud change).
