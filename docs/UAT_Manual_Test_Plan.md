# PingForce — UAT Manual Test Plan & Feature Usage Guide

| | |
|---|---|
| **Version** | 1.0 · 17 Jul 2026 |
| **Companion doc** | `docs/BRD_PingForce.md` |
| **Audience** | Business team, Product team, UAT testers |
| **Method** | Manual, role-based, on production stack, web + mobile |

Each test case's **Steps** column doubles as the usage guide for that feature —
follow it to learn the feature, then mark Pass/Fail.

---

## 1. Environments

| Surface | URL / access |
|---|---|
| Admin portal (web) | https://admin.pingforce.in |
| Marketing website | https://pingforce.in |
| API + Swagger | https://api.pingforce.in/api/docs (all endpoints under `/api/v1/...`) |
| Mobile app | Release APK from GitHub Actions artifact `PingForce-Mobile-Release-APK` (or Play Store build) |
| Grafana (ops only) | https://grafana.pingforce.in |

> If go-live is not finished yet (see `docs/GO_LIVE_PLAYBOOK.md`), the same plan
> can run against the staging stack — substitute hostnames.

## 2. Test Accounts — one per role

| # | Role | Account | How it is provisioned |
|---|---|---|---|
| 1 | Super Admin | `admin@pingforce.in` | Created by the production seed (`npx prisma db seed` with `SEED_SUPER_ADMIN_PASSWORD` set). Password held by platform operator. |
| 2 | Tenant Admin | e.g. `uat-admin@<yourco>.com` | Self-register a **dedicated UAT tenant** at https://admin.pingforce.in/register (or Super Admin creates the tenant at `/dashboard/platform/tenants/create`). The registering user becomes the tenant's `ADMIN_MANAGER`. |
| 3 | Employee | e.g. `uat-employee@<yourco>.com` | Tenant Admin creates the user in the admin portal with role **Employee / Field Staff** (or employee onboarding flow). |
| 4 | Customer | mobile no. / email of a Customer record | Tenant staff create a Customer, then send a **portal invite** (`POST /api/v1/customers/{customerId}/portal/invites`). Customer activates via the invite and sets a password. |

**Production rules:** use a dedicated UAT tenant so fixture data never mixes
with real tenants; use strong unique passwords (never `Test@123` in
production); delete or suspend the UAT tenant after sign-off.

## 3. How to log in, per role

- **Super Admin (web):** admin.pingforce.in → Login with the super-admin email.
  The same login form serves both super admins and tenant users — the platform
  detects the account type. Super Admin lands on the platform dashboard with the
  **Platform** menu (Tenants, Subscriptions, Platform Settings).
- **Tenant Admin (web):** same login page with the tenant admin credentials —
  lands on the tenant dashboard (CRM, Workforce, Network, Finance, Reports,
  Settings, Roles).
- **Employee (mobile):** install the APK → app resolves the tenant (tenant
  code/branding) → login with employee credentials → grant location &
  notification permissions when prompted.
- **Tenant Admin / Manager (mobile):** same app; manager accounts see the
  manager/tenant dashboard with team views.
- **Customer (API):** Swagger → `POST /api/v1/portal/auth/login` (password) or
  `POST /api/v1/portal/auth/otp/request` + `otp/verify`. Copy `accessToken`
  into Swagger's **Authorize** dialog to call the other `/portal/*` endpoints.

---

## 4. Suite A — Super Admin (web)

| ID | Feature | Steps (usage) | Expected |
|---|---|---|---|
| A1 | Login & session | Login at admin.pingforce.in with super-admin credentials | Lands on dashboard; Platform menu visible |
| A2 | Tenant list | Go to **Platform → Tenants** (`/dashboard/platform/tenants`) | All tenants listed with status |
| A3 | Create tenant | **Platform → Tenants → Create** — fill company details, admin user | New tenant appears in list; its admin can log in |
| A4 | Tenant detail & lifecycle | Open a tenant → view details; suspend then re-activate | Suspended tenant's users cannot log in; reactivation restores access |
| A5 | Subscriptions | **Platform → Subscriptions** — view plan catalog, assign/change a tenant's plan | Plan reflected on tenant record |
| A6 | Platform settings | **Platform → Settings** — view/edit a platform-level setting (e.g. Connection-Map employee-access ceiling) | Save succeeds; tenant admin role editor respects the ceiling |
| A7 | RBAC view | **Roles** (`/dashboard/rbac/roles`) | Can view system roles and grants |
| A8 | Negative: tenant data | Attempt to open a tenant-business URL (e.g. `/dashboard/workforce/attendance`) as Super Admin | Blocked or empty per design — Super Admin manages the platform, not tenant business data |
| A9 | Logout / session revoke | Logout; log back in; revoke another session via profile sessions list | Revoked session forced to re-login |

## 5. Suite B — Tenant Admin (web, plus mobile manager view)

| ID | Feature | Steps (usage) | Expected |
|---|---|---|---|
| B1 | Tenant registration | Register a new tenant at `/register`; login | Tenant created; registering user is ADMIN_MANAGER |
| B2 | Dashboard overview | Login → dashboard | Tenant KPIs (attendance today, open faults, visits) |
| B3 | User management | Create employee user, assign role Employee/Field Staff; deactivate & reactivate | Employee can log in on mobile; deactivated user rejected |
| B4 | Roles / RBAC | **Roles** → create custom role, adjust permissions, assign to a user | User's access changes accordingly; grants above the Super-Admin ceiling not offered |
| B5 | Master data | **Master Data** (`/dashboard/master-data/...`) — add/edit/delete a reference item | Item appears in mobile pick-lists |
| B6 | Geofences | **Settings → Geofences** — create geofence around office/site | Geofence enforced in attendance check-in (C3) |
| B7 | Attendance logs | **Workforce → Attendance** — after employee checks in (C3), view live logs; approve a correction request (C5) | Log matches employee action; correction status updates |
| B8 | Leave approvals | **Workforce → Leaves** — approve/reject leave from C6 | Employee notified; balance updated |
| B9 | Visits | **Workforce → Visits** — view visit created in C7; assign a planned visit | Visit visible on employee's mobile |
| B10 | Employee detail | **Workforce → Employee → :id** | Profile, documents, attendance summary |
| B11 | Devices | **Workforce → Devices** | Employee's registered device listed |
| B12 | CRM Leads | **CRM → Leads** — review lead captured in C9; change stage | Pipeline updates |
| B13 | Faults/Tickets | **CRM → Tickets** — create fault, assign to employee; later resolve/close after C8 | Assignment pushed to employee; SLA/status tracked |
| B14 | Connection Map | **Network → Map** — view assets; add/edit node & connection | Map renders; employee sees only assigned routes (C10) |
| B15 | Payroll | **Finance → Payroll** — view attendance-derived payroll inputs for the period | Work minutes credited from attendance |
| B16 | Claims | **Finance → Claims** — approve/reject claim from C11 | Status + notification to employee |
| B17 | Reports | **Reports** — run attendance & faults reports, export | Data matches suite activity; export downloads |
| B18 | Notifications | Bell/in-app list after the above actions | Assignment/approval events present |
| B19 | Customer + portal invite | Create a Customer; send portal invite (via UI if present, else Swagger `POST /customers/{id}/portal/invites`) | Invite delivered (email visible / token returned) — feeds Suite D |
| B20 | Mobile manager view | Login on mobile with this account | Manager/tenant dashboard: team attendance, faults overview |
| B21 | Negative: platform menu | As tenant admin, open `/dashboard/platform/tenants` | Blocked by role guard |

## 6. Suite C — Employee / Field Staff (mobile)

| ID | Feature | Steps (usage) | Expected |
|---|---|---|---|
| C1 | Install & tenant resolve | Install APK → open app | Splash → tenant resolution → tenant branding (white-label colors/logo) |
| C2 | Login + permissions + device | Login; grant location & notifications; device registers | Home dashboard; device appears in B11 |
| C3 | GPS check-in | **Attendance → Check-in** inside the geofence | Check-in accepted with GPS stamp; visible in B7 |
| C3n | Negative: outside geofence | Attempt check-in outside geofence | Rejected with clear message |
| C4 | Attendance history | **Attendance → History** | Today's session listed |
| C5 | Correction request | **Attendance → Correction** — request a fix with reason | Appears in B7 approval queue |
| C6 | Leave request | **Leave** — apply with dates/type | Appears in B8; status/notification round-trip |
| C7 | Visits | **Visits → New** — log a customer visit with GPS + photo; also execute the visit assigned in B9 | Visit saved; visible on web |
| C8 | Faults | **Faults** — open fault assigned in B13 → add visit attempt → resolve with notes/photo | Status flows to web; customer can rate (D6) |
| C9 | Lead capture | **Leads → New** — submit lead | Appears in B12 |
| C10 | Network map | **Network Map** | Only assigned routes/assets visible |
| C11 | Claim | **More/Claims** — submit expense claim with receipt photo | Appears in B16 |
| C12 | Reports | **Reports** — open own attendance report | Own data only |
| C13 | Offline sync | Enable airplane mode → check-in/attendance action → restore network → **Sync** | Queued action syncs without loss; sync screen shows status |
| C14 | Notifications | Receive push for B13 assignment / B8 approval | Push arrives; in-app list matches |
| C15 | Profile & security | **Profile** — change password; view sessions & login history; re-login | All function; old session revocable |
| C16 | Negative: RBAC | Look for admin functions (user mgmt, approvals) | Not present/blocked for employee role |

## 7. Suite D — Customer (portal API via Swagger)

> No portal UI yet (planned). Test at https://api.pingforce.in/api/docs.

| ID | Feature | Steps (usage) | Expected |
|---|---|---|---|
| D1 | Invite verify & activate | From B19 invite: `POST /portal/auth/invite/verify` then `invite/activate` (set password) | Account activated |
| D2 | Login (password + OTP) | `POST /portal/auth/login`; also `otp/request` → `otp/verify` | Tokens returned; authorize Swagger |
| D3 | My account | `GET /portal/me`, `/portal/account`, `/portal/connections` | Own data only, correct tenant |
| D4 | Raise fault | `POST /portal/faults` | Fault appears in tenant's queue (B13) |
| D5 | Track & comment | `GET /portal/faults`, `GET /portal/faults/{id}`, `POST /portal/faults/{id}/comments` | Status matches staff actions; comment visible to staff |
| D6 | Reopen & rate | After resolution: `POST /portal/faults/{id}/reopen`; then `POST /portal/faults/{id}/rating` | Reopen restores flow; rating stored |
| D7 | Service catalog | `GET /portal/catalog/plans`, `/portal/catalog/addons` | Tenant's published catalog |
| D8 | Service request | `POST /portal/service-requests`; track via `GET`; `POST /{id}/cancel` | Request visible to staff queue (`GET /service-requests`); cancel honoured |
| D9 | Token refresh & logout | `POST /portal/auth/refresh`; `POST /portal/auth/logout` | Refresh rotates tokens; logout invalidates |
| D10 | Negative: staff API | Call a staff endpoint (e.g. `GET /api/v1/employees`) with the customer token | 401/403 — portal identity cannot reach staff APIs |

## 8. Suite E — Cross-cutting security (any tester)

| ID | Check | Steps | Expected |
|---|---|---|---|
| E1 | Tenant isolation | Create 2 tenants (A3/B1); as tenant-A admin try to fetch tenant-B data (change IDs in API calls) | 403/404 — never tenant-B data |
| E2 | Role escalation | Employee token → call admin endpoint (e.g. `POST /api/v1/users`) via API | 403 |
| E3 | Brute force | 11+ wrong logins within a minute | Throttled (429) |
| E4 | Token expiry | Wait past access-token expiry (15 min) → call API → refresh | 401 then success after refresh; refresh rotation works |
| E5 | Error hygiene | Force an error (bad payload) | Clean error with request id; **no stack trace** |
| E6 | HTTPS | Try `http://` URLs | Redirect/refused |

---

## 9. Defect logging

Log every failure with: test ID, role/account, surface (web/mobile/API), steps,
expected vs actual, screenshot, timestamp, and the `request_id` from the API
error response (support can correlate it in logs).

## 10. Sign-off

| Suite | Tester | Date | Result | Notes |
|---|---|---|---|---|
| A — Super Admin | | | ☐ Pass ☐ Fail | |
| B — Tenant Admin | | | ☐ Pass ☐ Fail | |
| C — Employee (mobile) | | | ☐ Pass ☐ Fail | |
| D — Customer (API) | | | ☐ Pass ☐ Fail | |
| E — Security | | | ☐ Pass ☐ Fail | |
| **Product Owner approval** | | | ☐ Approved | |
