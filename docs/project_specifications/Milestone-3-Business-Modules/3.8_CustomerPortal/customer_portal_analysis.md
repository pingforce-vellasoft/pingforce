# 3.8 — Customer / End-User Portal: Analysis & Provisioning Plan

> **Status:** Analysis / Proposal
> **Date:** 2026-07-16
> **Scope:** Adding an end-user (customer) login persona alongside the existing Super Admin, Tenant Admin, Manager, and Employee personas, with self-service functionality (fault registration, plan changes, add-on/removal requests, etc.).

---

## 1. Current State (What Exists Today)

| Area | Current Implementation | Relevance to Customer Portal |
| --- | --- | --- |
| **Identity — platform** | `SuperAdmin` model (`super_admins` table), authenticated via JWT with `tenantId: 'SYSTEM'` sentinel in `jwt.strategy.ts` | Proves the codebase already supports **multiple identity types** in one JWT strategy — same pattern extends to customers |
| **Identity — tenant staff** | `User` model (`users` table) with `roleId` → DB-driven `Role` + `RolePermission`; staff-centric relations (`employee`, `scopeOverrides`, `assignedFaults`) | **Not suitable to reuse directly** for customers — it carries staff semantics (employee link, RBAC scope overrides, session/device policies tuned for staff) |
| **Customer entity** | `Customer` model exists (`customers` table) with `customerCode`, `primaryEmail`, `primaryMobile`, `accountManagerId`, parent/child hierarchy; full CRUD module at `apps/api/src/customer/` | Ready-made **account/organization anchor** for portal users — no schema rework needed |
| **Fault management** | `Fault` model already has optional `customerId` FK; `faults` module with SLA policies, escalation, timelines (Spec 3.3) | Fault register for customers is largely a **new entry channel** onto an existing engine, not a new engine |
| **RBAC** | `PERMISSION_CATALOG` (single source of truth), `RbacGuard`, `@RequirePermission('MODULE:ACTION')` | Catalog is extensible; customer-facing permissions can be added, but staff RBAC should **not** govern portal users (see §3.2) |
| **Auth plumbing** | JWT access + refresh rotation, `tokenVersion` invalidation, OTP service, password reset, session tracking, login history | All reusable for the customer audience |
| **Connections / plans** | **Do not exist yet.** No `Connection`, `Plan`, or `Subscription` models in `prisma/schema.prisma`. Spec 3.7 (ConnectionMap) is newly drafted | Plan-change / add-on features **depend on a Connection domain model** — must be built first or in parallel with 3.7 |
| **Frontends** | Angular 21 admin portal (staff), Flutter mobile (employees) | Neither is customer-facing; a portal surface is needed (see §6) |

### Gap Summary

1. No customer-facing identity/login (no portal user table, no auth flow, no JWT audience).
2. No service-catalog domain (plans, add-ons, connections) to request changes against.
3. No generic **Service Request** workflow for plan change / add-on / removal / relocation etc.
4. No customer-facing API surface, and no customer-facing frontend.

---

## 2. Recommended Identity Design: Separate `CustomerPortalUser`

### Decision

Introduce a **dedicated portal identity model** rather than reusing the staff `User` model.

```prisma
model CustomerPortalUser {
  id            String    @id @default(uuid())
  tenantId      String
  customerId    String            // anchor to the Customer account
  email         String?
  phone         String?
  passwordHash  String?           // nullable → OTP-only login supported
  status        String    @default("ACTIVE")   // ACTIVE, INVITED, SUSPENDED
  isPrimary     Boolean   @default(false)      // primary contact for the account
  portalRole    String    @default("MEMBER")   // OWNER, MEMBER, VIEWER (lightweight, not staff RBAC)
  tokenVersion  Int       @default(1)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  createdBy     String?
  updatedBy     String?
  deletedAt     DateTime?

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id])

  @@unique([tenantId, email])
  @@unique([tenantId, phone])
  @@unique([id, tenantId])
  @@index([tenantId, customerId])
  @@map("customer_portal_users")
}
```

### Why a separate model (and not a `CUSTOMER` role on `User`)

| Concern | Separate model | `User` + CUSTOMER role |
| --- | --- | --- |
| Staff RBAC bleed-through (scope overrides, role assignment UI, user provisioning flows all assume staff) | ✅ Isolated | ❌ Every staff-user query/screen must now exclude customers |
| One customer account, many contacts (enterprise ISP customer with 5 authorized contacts) | ✅ Natural (`customerId` FK, `isPrimary`) | ❌ Awkward |
| Different auth policies (OTP-first login, self-registration, weaker session limits) | ✅ Per-audience config | ❌ Conditional logic everywhere |
| Blast radius of a portal-user compromise | Limited to customer-scoped endpoints | Potentially staff endpoints if a guard is missed |
| Precedent in codebase | Matches existing `SuperAdmin` vs `User` split — **three identity tables, one JWT strategy** | — |

### JWT / auth integration

Extend the existing pattern in `jwt.strategy.ts`:

- Add a **`userType` claim** to all newly issued tokens: `'SUPER_ADMIN' | 'STAFF' | 'CUSTOMER'` (keep the `tenantId === 'SYSTEM'` check for backward compatibility during rollout).
- `validate()` branches on `userType === 'CUSTOMER'` → loads `CustomerPortalUser`, checks `tokenVersion`, and attaches `{ userId, tenantId, customerId, userType: 'CUSTOMER', portalRole }` to the request.
- Reuse as-is: refresh-token rotation, OTP service (phone-first login is ideal for end users), password reset, login history, session service (add `platform: 'PORTAL'`).
- New guard: **`CustomerAuthGuard`** — asserts `userType === 'CUSTOMER'`. Staff guards (`JwtAuthGuard` + `RbacGuard`) must **reject** customer tokens; add an explicit `userType !== 'CUSTOMER'` assertion in `RbacGuard` so a customer token can never satisfy a staff permission check.

### Tenant resolution — DECIDED: invite-based with embedded tenant code

Customers never type or know a `tenantId`. The **invite carries the tenant code**, and the client stores it after first successful use.

**Invite flow:**

1. Staff (or account `OWNER`) invites a contact from the customer detail screen → API creates a `CustomerPortalInvite` row and sends SMS/email containing:
   - A deep link / universal link: `pingforce://portal/invite?token=<inviteToken>` (mobile) and an equivalent web URL fallback.
   - Optionally a QR code (useful when technician onboards the customer during installation).
2. The **invite token is opaque and single-use** (random 256-bit, stored hashed, expiry e.g. 7 days). The tenant code is resolved **server-side from the token** — it is not trusted from client input.
3. On app install + invite acceptance: app calls `POST /api/v1/portal/auth/invite/verify` with the token → response returns `{ tenantCode, tenantBranding, maskedEmail/maskedPhone }` → user sets password and/or verifies OTP → account activated.
4. **After successful activation the app persists the tenant context** (`tenantCode`, branding, API base config) in `flutter_secure_storage` — all future logins on that device send `tenantCode` + credentials, no re-entry needed. Web portal persists the same in local storage keyed to the browser.
5. Re-install / new device: user logs in with `tenantCode` + email/phone + password/OTP. `tenantCode` is shown in the invite message and on the portal profile screen so it is recoverable; a "forgot tenant code" lookup by registered email/phone can be added later.

**New model:**

```prisma
model CustomerPortalInvite {
  id           String    @id @default(uuid())
  tenantId     String
  customerId   String
  email        String?
  phone        String?
  tokenHash    String    @unique
  portalRole   String    @default("MEMBER")
  status       String    @default("PENDING")  // PENDING, ACCEPTED, EXPIRED, REVOKED
  expiresAt    DateTime
  acceptedAt   DateTime?
  invitedById  String              // staff User id or portal OWNER id
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  @@unique([id, tenantId])
  @@index([tenantId, customerId])
  @@index([tenantId, status])
  @@map("customer_portal_invites")
}
```

The tenant code already exists: `Tenant.code` (`String @unique` in `prisma/schema.prisma`) — reuse it. It is used only for login routing (tenant lookup), never as an authorization input; authorization always comes from the JWT.

---

## 3. Authorization Model for the Portal

### 3.1 Data scoping — the non-negotiable rule

Every portal query is scoped by **both** `tenantId` **and** `customerId` (from the JWT, never from request body/params):

```typescript
async findMyFaults(tenantId: string, customerId: string): Promise<Fault[]> {
  return this.prisma.fault.findMany({
    where: { tenantId, customerId, deletedAt: null },
  });
}
```

This is the customer-portal analogue of the existing tenant-isolation rule and must be enforced in every portal repository method.

### 3.2 Lightweight portal roles (not staff RBAC)

Do **not** put portal users into the tenant `Role`/`RolePermission` system. Use a small fixed enum on `CustomerPortalUser.portalRole`:

| Portal role | Capabilities |
| --- | --- |
| `OWNER` | Everything below + manage portal users on the account, approve billing-impacting requests |
| `MEMBER` | Raise faults, raise service requests, view invoices/usage |
| `VIEWER` | Read-only (dashboards, invoices, request status) |

Rationale: portal permissions are product-defined and uniform across tenants; tenant-configurable RBAC adds complexity with no user value here. If per-tenant portal customization is later required, this enum can migrate into the catalog.

---

## 4. New Domain Models Required

### 4.1 Service catalog & connections (prerequisite — coordinate with Spec 3.7)

```
ServicePlan        — tenant-defined plan catalog (name, speed/spec, price, billingCycle, isActive)
AddOn              — tenant-defined add-on catalog (static IP, OTT bundle, extra data, router rental…)
Connection         — the customer's live subscription instance:
                     tenantId, customerId, connectionCode, servicePlanId, status
                     (PENDING_INSTALL, ACTIVE, SUSPENDED, TERMINATED),
                     installationAddress, geo (lat/lng — ties into 3.7 ConnectionMap), activatedAt
ConnectionAddOn    — join table: connectionId, addOnId, status, activatedAt, removedAt
```

A customer may hold **multiple connections** (multi-site enterprise); all portal features hang off `Connection`, not directly off `Customer`.

### 4.2 Service Request workflow (the portal's core engine)

One generic model covers plan change, add-on add/remove, relocation, suspension, termination, upgrades — avoids one table per request type:

```prisma
model ServiceRequest {
  id            String    @id @default(uuid())
  tenantId      String
  customerId    String
  connectionId  String?
  requestNumber String              // per-tenant sequence, like faultNumber
  type          String              // PLAN_CHANGE, ADDON_ADD, ADDON_REMOVE, RELOCATION,
                                    // SUSPENSION, RESUMPTION, TERMINATION, SPEED_UPGRADE, OTHER
  status        String    @default("SUBMITTED")
                                    // SUBMITTED, UNDER_REVIEW, APPROVED, SCHEDULED,
                                    // IN_PROGRESS, COMPLETED, REJECTED, CANCELLED
  payload       Json                // type-specific detail (target planId, addOnId, new address…)
  requestedById String              // CustomerPortalUser id
  assignedToId  String?             // staff User id
  scheduledAt   DateTime?
  resolvedAt    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  createdBy     String?
  updatedBy     String?

  @@unique([tenantId, requestNumber])
  @@unique([id, tenantId])
  @@index([tenantId, customerId])
  @@index([tenantId, status])
  @@index([tenantId, assignedToId])
  @@map("service_requests")
}
```

Plus `ServiceRequestTimeline` (mirror of `FaultTimeline`) for status history visible to the customer.

**Workflow integration:** route `APPROVED` transitions through the existing **approvals module** (`apps/api/src/approvals/` already supports stage-based approval with `approverRoleId`), and fulfilment work orders through **visits** (3.2) when a field technician is needed (relocation, installation).

### 4.3 Fault model extension (minimal)

`Fault.customerId` already exists. Add only:

- `reportedByPortalUserId String?` — distinguishes customer-raised vs staff-raised faults.
- `channel String @default("STAFF")` — `STAFF | PORTAL | MOBILE` for reporting/analytics.

Customer fault registration then reuses the entire 3.3 engine: SLA policies, escalation, timelines (timeline entries flagged internal vs customer-visible — add `isCustomerVisible Boolean @default(false)` to `FaultTimeline`).

---

## 5. Portal Feature Set & API Surface

New NestJS module: `apps/api/src/portal/` (own module per feature convention), all routes under `/api/v1/portal/**`, all guarded by `CustomerAuthGuard`, all services scoped `tenantId + customerId`.

### Phase 1 — MVP

| Feature | Endpoints (indicative) |
| --- | --- |
| Auth: login (password/OTP), refresh, logout, forgot password, invite-acceptance | `POST /portal/auth/login`, `/otp/request`, `/otp/verify`, `/refresh`, `/logout` |
| My profile & account | `GET/PATCH /portal/me`, `GET /portal/account` |
| My connections & current plan/add-ons | `GET /portal/connections`, `GET /portal/connections/:id` |
| **Fault register** (create, track, comment, reopen) | `POST /portal/faults`, `GET /portal/faults`, `GET /portal/faults/:id`, `POST /portal/faults/:id/comments` |
| **Service requests** (plan change, add-on add/remove) | `GET /portal/plans`, `GET /portal/addons`, `POST /portal/service-requests`, `GET /portal/service-requests`, `POST /portal/service-requests/:id/cancel` |
| Notifications | Reuse 3.6 business-notifications: request/fault status changes → email/SMS/push to portal user |

### Phase 2 — Self-service expansion

- Invoices & payment history (needs billing domain), online payment gateway hook.
- Usage dashboards (data consumption for ISPs).
- Scheduled-visit visibility: customer sees/confirms/reschedules technician visit slots (ties into 3.2 visits).
- Ratings/CSAT on fault closure and completed requests.
- Knowledge base / outage banner (planned-maintenance announcements per region).
- Account-level portal user management by `OWNER` (invite/remove contacts).

### Phase 3 — Engagement

- Referral programs, plan-renewal reminders, chat/AI assistant (fits "AI-native" positioning), WhatsApp bot channel reusing the same portal APIs.

### Staff-side additions (admin portal)

- Service-request queue screen (list, assign, transition status) — mirrors fault workflow UI.
- Portal-user management on the customer detail page (invite contact, reset access, suspend).
- Catalog management screens: plans & add-ons CRUD.
- New staff permissions in `PERMISSION_CATALOG`: `SERVICE_REQUESTS:{READ,UPDATE,ASSIGN}`, `CATALOG:{READ,CREATE,UPDATE,DELETE}`, `PORTAL_USERS:{READ,CREATE,UPDATE,DELETE}`.

---

## 6. Frontend Surface — DECIDED: mobile-first + web

**Decision:** customer gets **both** surfaces. Mobile app first; web portal alongside because the mobile build is Android-only today and iOS customers need access from day one.

| Priority | Surface | Notes |
| --- | --- | --- |
| 1 | **New Flutter customer app** (`apps/customer_mobile/`) — separate app, **not** a mode inside the employee app | Android first (matches current build pipeline). Same Clean Architecture + Riverpod conventions as `apps/mobile/`. Handles invite deep link / QR, stores tenant context in `flutter_secure_storage`. iOS build later from the same codebase. |
| 2 | **Angular customer web portal** (`apps/portal/`) in the NX workspace | Covers iOS/desktop users until the iOS app ships, and remains the fallback surface permanently. Deploy on Firebase Hosting like admin. Same invite links open here when the app is not installed (universal-link fallback). |

Keep the employee app untouched — it is deeply employee-centric (attendance, GPS visits, offline sync); mixing personas complicates sync and increases blast radius.

Both surfaces consume the same `/api/v1/portal/**` API; feature parity tracked per phase. White-label requirement: theme (logo, colors) served from tenant config at invite-verify/login time — same mechanism the employee app uses for tenant branding.

---

## 7. Security Checklist (Portal-Specific)

- [ ] `CustomerAuthGuard` on every portal route; `RbacGuard` explicitly rejects `userType: 'CUSTOMER'` tokens.
- [ ] `customerId` and `tenantId` always taken from JWT — never from request input.
- [ ] Portal users can only see customer-visible fault timeline entries (`isCustomerVisible`).
- [ ] Self-registration disabled by default — portal users are **invited** (created by staff or by account `OWNER`); prevents enumeration/spam signups.
- [ ] Stricter rate limits on portal auth endpoints (existing tiered throttling supports this).
- [ ] Separate refresh-token policy/session limits for the `PORTAL` platform.
- [ ] Audit logging on all portal mutations with `tenant_id`, `customer_id`, `portal_user_id`, `request_id`.
- [ ] Uploaded fault attachments (photos) go through existing files module → OCI Object Storage with per-customer access checks.
- [ ] No cross-customer data in list endpoints — verified by dedicated tenant+customer isolation tests.

---

## 8. Implementation Phases

| Phase | Deliverables | Depends on |
| --- | --- | --- |
| **P1 — Identity** | `CustomerPortalUser` migration, portal auth (login/OTP/refresh/invite), `CustomerAuthGuard`, `userType` claim, staff screens to invite portal users | — |
| **P2 — Fault register** | Fault channel/reporter fields, `isCustomerVisible` timeline flag, portal fault endpoints, notifications | P1, existing 3.3 |
| **P3 — Catalog + connections** | `ServicePlan`, `AddOn`, `Connection`, `ConnectionAddOn` models + staff CRUD | Coordinate with Spec 3.7 |
| **P4 — Service requests** | `ServiceRequest` + timeline, portal endpoints, staff queue UI, approvals integration, `PortalSettings` + `ServiceRequestPolicy` config models + Portal Settings admin screen (§9.2) | P3 |
| **P5 — Portal frontends** | Flutter customer app `apps/customer_mobile/` (Android first) + Angular `apps/portal/` web (iOS/desktop coverage); both can start against P1/P2 APIs in parallel | P1 |
| **P6 — Phase-2 features** | Payments, usage, visit scheduling, CSAT | P4, billing domain |

---

## 9. Decisions

### 9.1 Resolved

| # | Decision | Resolution |
| --- | --- | --- |
| 1 | Tenant resolution at login | **Invite-based** — invite carries tenant code; client stores it after activation (§2) |
| 2 | Self-registration | **Invite-only** — no open signup |
| 5 | Portal channel priority | **Mobile-first (Flutter customer app, Android) + web portal in parallel** for iOS/desktop users (§6) |

### 9.2 Resolved — decisions 3, 4, 6: tenant-configurable

**Product Owner decision (2026-07-16):** none of these are hard-coded product rules. Each tenant configures its own commercial behavior via admin-portal settings. The platform ships sensible defaults (the recommendations below become the seed values); tenant admins change them under a new **Portal Settings** screen.

#### Configuration model

```prisma
// One row per tenant — portal commercial behavior
model PortalSettings {
  id                     String    @id @default(uuid())
  tenantId               String    @unique
  planChangeEffect       String    @default("HYBRID")     // IMMEDIATE, NEXT_CYCLE, HYBRID
  prorationMode          String    @default("NONE")        // NONE, FULL, UPFRONT_DIFFERENCE
  billingDisplayMode     String    @default("NONE")        // NONE, READ_ONLY, FULL
  duesBlockAutoApproval  Boolean   @default(false)         // gate auto-approve on outstanding dues
  approverQueueMode      String    @default("ACCOUNT_MANAGER") // ACCOUNT_MANAGER, SHARED_QUEUE
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  createdBy              String?
  updatedBy              String?

  @@map("portal_settings")
}

// One row per tenant per request type — approval routing
model ServiceRequestPolicy {
  id          String    @id @default(uuid())
  tenantId    String
  requestType String              // PLAN_CHANGE_UPGRADE, PLAN_CHANGE_DOWNGRADE, ADDON_ADD, ...
  mode        String    @default("APPROVAL")  // AUTO, APPROVAL, AUTO_WITH_LIMITS
  limits      Json?               // e.g. { "maxSuspensionDaysPerYear": 30 }
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdBy   String?
  updatedBy   String?
  deletedAt   DateTime?

  @@unique([tenantId, requestType])
  @@index([tenantId])
  @@map("service_request_policies")
}
```

**How it applies:**

- **Decision 3 (plan-change rules):** `planChangeEffect` + `prorationMode` read by the ServiceRequest service when processing `PLAN_CHANGE`. Seed default: `HYBRID` + `NONE` (upgrades immediate, downgrades next cycle, no proration math). `FULL`/`UPFRONT_DIFFERENCE` proration modes stay selectable but are **inactive until the billing module exists** — admin UI shows them disabled with a "requires billing module" hint.
- **Decision 4 (approval routing):** `ServiceRequestPolicy` row per type; seed defaults = the recommended matrix in the analysis below (upgrades/add-ons AUTO, downgrades/termination/relocation APPROVAL, suspension AUTO_WITH_LIMITS 30 days/year). `approverQueueMode` decides routing target; `duesBlockAutoApproval` inert until billing data exists.
- **Decision 6 (billing scope):** `billingDisplayMode` gates what the portal shows. Default `NONE`. `READ_ONLY`/`FULL` selectable only once the corresponding billing capability ships — **configurability does not remove the build dependency**; it only means no tenant is forced into one behavior.

**Implementation notes:**

- Seed defaults on tenant provisioning (same pattern as role/permission grants in `TenantsService`).
- Cache per-tenant settings in Redis (same approach as existing geofence/RBAC caching); invalidate on update.
- New staff permissions: `PORTAL_SETTINGS:{READ,UPDATE}` in `PERMISSION_CATALOG`.
- Admin UI: "Portal Settings" page (settings section) — plan-change rules, per-type approval matrix, billing display toggle.
- Every settings change audit-logged (commercial impact).

The detailed option analysis below is retained as reference for what each configuration value means.

### 9.3 Reference — option analysis per decision

#### Decision 3 — Plan-change commercial rules

**What this is about:** when a customer submits a plan change (e.g., 50 Mbps ₹600/mo → 100 Mbps ₹900/mo), the system must know *when* the new plan takes effect and *how the money is adjusted* for the partial period. This decision shapes the `ServiceRequest` payload, the `Connection` state machine, and any billing integration — it blocks Phase 4 design.

**Sub-decision 3a — When does the change take effect?**

| Option | How it works | Pros | Cons |
| --- | --- | --- | --- |
| **Immediate** | Plan switches as soon as the request is approved/provisioned | Customer sees instant value (esp. upgrades); fewer pending states | Requires proration math; mid-cycle billing adjustments; harder to explain on invoice |
| **Next billing cycle** | Change is queued; connection carries `pendingPlanId` + `effectiveFrom`; switches on cycle date | No proration at all; clean invoices; simplest to build | Customer waits (bad for urgent upgrades); need UI showing "change scheduled for <date>" |
| **Hybrid (common ISP practice)** | **Upgrades immediate, downgrades at next cycle** | Revenue-friendly; matches customer expectation (want more speed now, don't care when downgrade lands) | Two code paths; still needs proration for upgrades |

**Sub-decision 3b — Proration (only if anything is immediate):**

- **Full proration:** charge/credit the per-day difference for remaining days. Fairest; most math; invoice line items needed.
- **No proration, charge new price from next invoice:** simplest; slight revenue giveaway on upgrades.
- **Upgrade charge = difference collected upfront** (one-time adjustment payment before activation): protects revenue; needs payment collection in the flow — pulls billing/payment into MVP scope.

**Recommendation:** Hybrid effect (3a) + "new price from next invoice, no proration" (3b) for MVP. Zero proration math, revenue-safe enough, and no payment gateway dependency. Full proration becomes a billing-module feature later.

**Questions to answer:** Do your target tenants (ISPs) bill prepaid or postpaid? Prepaid changes everything — plan change usually means "apply on next recharge," which is effectively the next-cycle option.

---

#### Decision 4 — Which request types need staff approval vs auto-approve

**What this is about:** every `ServiceRequest` lands in `SUBMITTED`. The question is which types route through the approvals module (a human decides) and which jump straight to `APPROVED`/`SCHEDULED` (system decides). Too much manual approval → staff burden and slow customer experience; too much auto-approval → revenue/abuse risk.

Per-type analysis with recommendation:

| Request type | Risk if auto-approved | Recommendation |
| --- | --- | --- |
| `PLAN_CHANGE` (upgrade) | Low — more revenue; only risk is capacity in customer's area | **Auto-approve**, but block if connection status isn't `ACTIVE` or dues pending |
| `PLAN_CHANGE` (downgrade) | Revenue loss; retention opportunity missed | **Staff approval** — gives account manager a retention touchpoint |
| `ADDON_ADD` | Low — more revenue | **Auto-approve** (stock-limited add-ons like router rental → approval) |
| `ADDON_REMOVE` | Small revenue loss; may be contract-bound (e.g., 6-month OTT bundle) | **Auto-approve unless add-on has a lock-in flag** → then approval |
| `RELOCATION` | Needs feasibility check (coverage at new address) + technician visit | **Always staff approval** → then visit scheduling |
| `SUSPENSION` (temporary, e.g., travel) | Revenue pause; usually policy-bound (max N days/year) | **Auto-approve within policy limits**, approval beyond |
| `RESUMPTION` | None | **Auto-approve** |
| `TERMINATION` | Churn; equipment recovery; final settlement | **Always staff approval** — retention call + equipment-return workflow |

**Design implication:** make this **per-tenant configurable**, not hard-coded — a `ServiceRequestPolicy` config (per type: `AUTO`, `APPROVAL`, `AUTO_WITH_LIMITS` + limit params) that the tenant admin edits. The approvals module (`approverRoleId` stages) already supports routing; the policy just decides whether to invoke it. MVP can ship with the recommended defaults above as seed data.

**Questions to answer:** (1) Accept the default matrix above? (2) Should dues/outstanding-balance checks gate auto-approval (needs billing data)? (3) Who approves — account manager of that customer, or a shared back-office queue?

---

#### Decision 6 — Billing scope in MVP

**What this is about:** customers will expect "my invoices / my payments / pay now" in any telecom-style portal, but **no billing domain exists in PingForce today** (no Invoice/Payment models — only platform-level tenant billing for Super Admin). This decision is really "how much of a billing module are we willing to build (or integrate) to support the portal MVP?"

Options, smallest to largest:

| Option | What ships in portal | What must be built | Effort |
| --- | --- | --- | --- |
| **A. No billing in MVP** | Nothing money-related; portal is faults + service requests + connection info | Nothing | None — **fastest MVP** |
| **B. Read-only invoice display** | "My invoices" list + PDF download; no payment | `Invoice` model + staff upload/generation OR import from tenant's existing billing system (CSV/API) | Medium |
| **C. Full billing + online payment** | Invoices, dues, payment gateway (Razorpay/Stripe), receipts, auto-suspend on non-payment | Entire billing module: invoicing engine, payment gateway integration, reconciliation, webhooks, refunds | Large — a milestone of its own |

**Key consideration:** most target tenants (ISPs, facility management) **already run a billing system** (Tally, dedicated ISP billing like Jazenet/Hyperms, or spreadsheets). Two very different strategies follow:

- **PingForce becomes their billing system** → Option C eventually, big commitment, big product surface.
- **PingForce integrates/display-only** → Option B via import; billing stays external; portal shows read-only state.

**Recommendation:** Option A for portal MVP (billing absence doesn't block fault register or service requests — the two features you named). Decide B-vs-C as a separate product-roadmap question, because it defines whether PingForce competes with ISP billing platforms or coexists with them. Note: Decision 3 (proration) and Decision 4 (dues-gating) both get simpler under A — no proration possible, no dues check available, revisit both when billing lands.

**Questions to answer:** (1) Do your pilot tenants have an existing billing system, and does it have an API? (2) Is "collect payments online" a sales requirement for landing tenants, or a nice-to-have? (3) Prepaid or postpaid dominant among target tenants (same question feeds Decision 3)?
