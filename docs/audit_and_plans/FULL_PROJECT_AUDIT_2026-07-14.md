# PingForce Full Project Audit & Master Plan

**Date:** 2026-07-14
**Method:** Three parallel deep audits — Backend (NestJS/Prisma), Frontend (Angular/Flutter), Docs-vs-Code gap analysis. Every finding verified against source with file:line references.

---

## Verdict in One Paragraph

The architecture skeleton is good (flat module graph, tenant isolation on queries is mostly correct, faults module shows a working CQRS pattern), but the **security posture is broken** (RBAC effectively disabled, privilege escalation paths in both API and admin UI, password hashes leaked in list responses), the **Flutter app does not compile**, and roughly half of what the specs describe is **stubbed or simulated** (OTP, notifications, file storage, offline sync, audit logging). Fix security and the build first; CQRS/DDD migration is worthwhile only for the attendance module.

---

## P0 — Security Emergencies (fix before anything else)

| # | Issue | Location |
|---|---|---|
| 1 | RBAC effectively disabled — `@RequirePermission` only on tenants + platform-settings; every business controller has only `JwtAuthGuard`. Any authenticated user can hit every endpoint | all API controllers |
| 2 | Privilege escalation — `rbac.controller.ts` has `RbacGuard` but zero `@RequirePermission` → guard passes; any tenant user can create roles and grant themselves all permissions | `apps/api/src/rbac/rbac.controller.ts:16-70` |
| 3 | Admin UI: missing role defaults to **SUPER_ADMIN** (`roleCode \|\| 'SUPER_ADMIN'`) | `apps/admin/src/app/core/auth/auth.service.ts:104` |
| 4 | Password hash leakage — list endpoints `include` full User records (`passwordHash`, `tokenVersion`) in lead, faults, customer, leave responses | `lead.repository.ts:37`, `faults.repository.ts:33`, `customer.repository.ts:46`, `leave.service.ts:101` |
| 5 | Payroll: any employee can create salary structures / generate payslips; `@Body() data: any`, no DTO | `payroll.controller.ts:21,26,58` |
| 6 | Claims mass-assignment: raw body spread into `prisma.create`; attacker sets any `employeeId`/`amount`; anyone can approve own claims | `claims.controller.ts:25`, `claims.service.ts:8-13` |
| 7 | Leave: client supplies `employeeId` (file leave for anyone); approve/reject has no role check (self-approval). Also `req.user.id` is undefined (strategy returns `userId`) so `approvedBy` never recorded | `leave.controller.ts:22-77` |
| 8 | Startup data destruction: `TenantsService.onModuleInit()` runs `tenant.updateMany({})` with **no where clause** — overwrites every tenant's billing/contact/plan with demo values on every boot | `tenants.service.ts:16-32` |
| 9 | Biometric punch signature verification mocked: `const isVerified = true;` | `attendance.service.ts:83` |
| 10 | Google auth auto-registers anyone with a Google account + guessable 6-char tenant code as ACTIVE tenant user | `auth.service.ts:327-351` |
| 11 | Seeded super-admin password `Admin@123` committed to repo | `prisma/seed.ts:164` |
| 12 | Admin tokens (access + refresh) in localStorage (XSS-exfiltratable) | `auth.service.ts:20-84` |
| 13 | Flutter route guard hard-returns `true`; TokenInterceptor 401 handler empty (no refresh, no logout) | `app_shell.dart:769`, `token_interceptor.dart:25-30` |

**P0 fix strategy:** register `RbacGuard` as a global `APP_GUARD`, add `@RequirePermission` to every business route, replace `include: { user: true }` with explicit `select`, add class-validator DTOs to payroll/claims/rbac/tenants/shift/platform-settings, derive `employeeId` from JWT everywhere, delete the `onModuleInit` seeding block, change SUPER_ADMIN fallback to least-privilege.

---

## P1 — Build & Correctness Blockers

### Flutter cannot compile
- pubspec missing: `flutter_riverpod`, `go_router`, `freezed_annotation`, `google_fonts`, `google_maps_flutter`; dev: `freezed`, `build_runner`. Declared-but-unused: `flutter_bloc` (remove)
- Broken imports: `fault_notifier.dart` and `mock_location_blocker.dart` don't exist (classes buried in other widget files); `checkInNotifierProvider` used but never defined; zero `*.freezed.dart` generated
- `app_router.dart:16-20` comments out all real screens → everything routes to `_PlaceholderScreen`

### Two disconnected architectures (Flutter)
Real clean-architecture layer (get_it, dio, usecases, repos with Either/Failure) exists but the Riverpod UI never calls it — auth/dashboard notifiers simulate with `Future.delayed` and hardcoded data. Bridge get_it into Riverpod providers and wire notifiers to real usecases.

### Stubbed infrastructure passing as real
- Connectivity always returns online/wifi (`connectivity_provider.dart:134`); sync is a 200ms fake delay, queue in-memory only (Hive initialized but never opened)
- OTP/password reset endpoint returns "OTP sent" and does nothing (`auth.controller.ts:62-66`)
- Email/SMS notifications log-only; no Push/FCM/WhatsApp/In-App
- File uploads store metadata only — no bytes, no OCI Object Storage
- AuditLog model exists, **zero writes** anywhere
- Fake demo data injected in admin attendance logs when API returns empty (`attendance-logs.component.ts:730-780`)
- Route prefix bug: employee/shift/master-data controllers use `v1/...` prefix on top of URI versioning → `/api/v1/v1/...`

---

## P2 — Architecture & Data Layer

### Prisma / data
- `EmployeeDevice` has no `tenantId` (business table, globally unique deviceId)
- Missing `deletedAt/createdBy/updatedBy` on ~12 models (payroll, claims, timelines, Role, SlaPolicy, FileAttachment, notifications)
- Soft-delete extension bugs: `Fault` not in list (hard-deleted today); `update/upsert/aggregate` not guarded; `delete→update` rewrite escapes `$transaction`
- Money as `Float` in payroll/claims/lead → use `@db.Decimal(12,2)`
- Missing `$transaction`: `punch` (TOCTOU double-punch race), `registerDevice`, `updateRolePermissions`, `createGeofence`

### Performance
- `RbacGuard` runs 3-level nested DB query per request — embed permission codes in JWT claims (per CLAUDE.md) or cache with tokenVersion key
- Unbounded list queries: pending leaves, devices, geofences, roles — add pagination
- 6-deep include tree in attendance logs; `Math.random()` fake metrics per row

### Layering
- Only employee/customer/lead/claims/faults have repositories; 12 modules call Prisma from services
- Delete 4 dead root-level empty DTO files in customer/ and lead/ (silently disable validation if imported)
- 98 `any` in API, 42 in admin — forbidden by standards
- Empty `FilesController`/`SettingsController` — implement or delete

### Angular conventions
- Zero `signal()`/`computed()` usage in pages; 8 components inject HttpClient directly; god components up to 1144 lines (mostly inline CSS — extract); no shared table/notification/confirm components
- `error.interceptor.ts` refresh-failure path hangs queued requests forever

---

## CQRS / DDD Decision (no Kafka — in-process EventBus + BullMQ)

Faults module is the ceiling: thin CQRS (command/query handlers + EventBus side-effects), no event sourcing, no heavyweight aggregates. Do not exceed it.

| Module | Verdict | Rationale |
|---|---|---|
| **faults** | Keep full CQRS | Already there; real state machine + SLA. Add BullMQ SLA-breach scheduled job |
| **attendance** | **Migrate to full CQRS+DDD** | Best ROI. Punch state machine, geofence/device-trust invariants, TOCTOU races exist because invariants live in ad-hoc query sequences. `AttendanceSession` aggregate enforcing "one open session"; `EmployeePunchedEvent` → BullMQ rollups |
| **leave** | Tactical DDD only | `LeaveRequest` aggregate + balance ledger with `approve()`/`reject()` domain methods. 4 use-cases — buses add nothing |
| **payroll** | Tactical DDD only | Extract pure `PayrollCalculator` domain service (currently buried in Bull processor with hardcoded 22 days). BullMQ stays as async backbone |
| **claims** | Layered CRUD | One status transition; needs DTOs + RBAC, not architecture |
| **employee** | Layered CRUD | Pure CRUD — CQRS is over-engineering |
| **customer** | Layered CRUD | Same |
| **lead** | Layered CRUD | Revisit only if stage-transition rules appear → tactical `Lead.moveToStage()` |
| **shift** | Layered CRUD | Add missing overlap-assignment guard clause |

**Eventing standard:** `@nestjs/cqrs` EventBus for in-process domain events; BullMQ for durable/async work (payroll runs, SLA scans, notification delivery). Remove unused `EventEmitterModule`.

---

## Docs-vs-Code Status (Milestones)

| Area | Grade |
|---|---|
| 2.1 Auth | PARTIAL (OTP fake, Session/DeviceToken models unused, no revocation) |
| 2.2 RBAC | PARTIAL (dataScope hardcoded 'OWN'; no menu/screen/field perms) |
| 2.3 Multi-tenant | PARTIAL (no Branch/Dept/Team/Designation APIs) |
| 2.4 User mgmt | PARTIAL |
| 2.5 White-label | STUBBED (one hex color; 221 hardcoded Colors.* in Flutter) |
| 2.6 Settings | PARTIAL |
| 2.7 Security framework | STUBBED (AuditLog unwritten; no login history/API keys/password policy) |
| 2.8 Notifications | STUBBED (log-only email/SMS) |
| 2.9 Files | STUBBED (metadata only) |
| 2.10 Master data | PARTIAL–IMPLEMENTED |
| 2.11 Workflow engine | NOT STARTED |
| 3.1 Attendance | PARTIAL (no state machine/policies/breaks/offline-sync API) |
| 3.2 GPS visits | STUBBED |
| 3.3 Faults | PARTIAL (no escalation jobs/RCA/feedback) |
| 3.4 Leads | PARTIAL (no quotations/conversion) |
| 3.5 Reports | NOT STARTED |
| 3.6 Business notifications | NOT STARTED |

**Undocumented code (spec or gate):** payroll, expense claims, platform billing/super-admin, Google OAuth, tenant self-registration, several mobile screens.

**Doc hygiene:** PROJECT_STATE.md files track documentation not code — add a real implementation-status tracker; delete duplicate M1 doc set (`not required/`); tests ~zero vs 90% DoD.

---

## Phased Master Plan

**Phase 0 — Security lockdown (days)**
Global RbacGuard + permissions on all routes; fix SUPER_ADMIN fallback; select-not-include for User; DTOs on payroll/claims/rbac/tenants/shift; employeeId from JWT; delete tenant-overwrite onModuleInit; rotate seed password; fix route prefix `/v1/v1`.

**Phase 1 — Make it build & real (week)**
Flutter pubspec + missing files + freezed codegen; wire Riverpod → get_it usecases; real auth guard + token refresh (both apps); remove all fake/demo data paths; real connectivity check.

**Phase 2 — Compliance & platform plumbing (1–2 weeks)**
Audit-log interceptor (model exists); real OTP/password reset; session persistence + revocation; refresh-token reuse detection; RBAC data scopes (OWN/TEAM/BRANCH/TENANT); real email (SMTP) + FCM push; OCI Object Storage for files.

**Phase 3 — Data layer hardening (parallel with 2)**
Soft-delete extension rewrite; missing audit columns + tenantId on EmployeeDevice; Decimal for money; $transaction on punch/device/roles/geofence; pagination everywhere; RBAC perms into JWT claims.

**Phase 4 — Targeted architecture (2–3 weeks)**
Attendance → CQRS+DDD (faults pattern); leave + payroll tactical domain models; SLA-breach BullMQ job; shared workflow/approval service (unblocks 2.11, leave, corrections); repositories for remaining modules; delete dead DTOs/controllers.

**Phase 5 — Frontend quality**
Angular: services for all HTTP, signals migration, extract god-component CSS/dialogs, shared DataTable/Notification components, typed models via @pingforce-monorepo/dto. Flutter: domain layers for leave/documents/onboarding, AppColors/tenant theming sweep (white-label), Hive-persisted sync queue, real offline sync endpoint + client.

**Phase 6 — Product gaps**
Org hierarchy CRUD; fault escalation; lead conversion; reports & analytics; business notifications; white-label theme engine. Tests throughout every phase (currently ~0 vs 90% DoD); CI security-scan + deploy stages.
