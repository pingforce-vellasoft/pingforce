# PingForce — Business Requirements Document (BRD)

| | |
|---|---|
| **Product** | PingForce — Workforce Management SaaS |
| **Owner** | Vellasoft |
| **Version** | 1.0 |
| **Date** | 17 Jul 2026 |
| **Audience** | Business team, Product team, UAT reviewers |
| **Status** | All core modules code-complete; production (OCI) go-live in progress |

---

## 1. Executive Summary

PingForce is a cloud-native, AI-native, **multi-tenant, white-label Workforce
Management SaaS** targeted at ISPs, field-service organisations, facility
management, security agencies, and telecom operators.

One platform instance serves many customer companies ("tenants"). Each tenant
gets its own branded experience, its own users, and fully isolated data. Field
staff work from a mobile app (Android/iOS, offline-first); managers and admins
work from a web admin portal; the tenant's end-customers use a customer portal
(API live today, UI planned).

**Business goals**

1. Replace manual attendance registers, WhatsApp-based fault dispatch, and
   spreadsheet payroll inputs with one auditable system.
2. Give field-service businesses real-time visibility of their workforce (GPS
   attendance, visits, fault resolution SLAs).
3. Monetise as subscription SaaS — per-tenant plans, managed centrally by the
   platform operator (Super Admin).

---

## 2. Product Surfaces (Clients)

| Surface | Technology | Users | Production URL |
|---|---|---|---|
| Marketing website | Angular (Firebase Hosting) | Public | https://pingforce.in |
| Admin web portal | Angular 21 (Firebase Hosting) | Super Admin, Tenant Admin/Manager | https://admin.pingforce.in |
| Mobile app | Flutter (Android/iOS) | Employees / field staff, managers | Play Store / APK (CI artifact) |
| Backend API + Swagger | NestJS on OCI | All clients | https://api.pingforce.in (Swagger: `/api/docs`) |
| Customer portal | API shipped; web/app UI planned | Tenant's end-customers | via `https://api.pingforce.in/api/v1/portal/*` |
| Dashboards (internal) | Grafana / Bull Board | Platform operators | https://grafana.pingforce.in · `api.pingforce.in/queues` |

---

## 3. User Roles & Access Model

### 3.1 Role hierarchy

| Role | Identity store | Logs into | Scope |
|---|---|---|---|
| **Super Admin** | Platform-level `SuperAdmin` account (not inside any tenant) | Admin portal | Whole platform: all tenants, subscriptions, platform settings |
| **Tenant Admin / Manager** (`ADMIN_MANAGER`) | Tenant user | Admin portal (+ mobile manager dashboard) | Their tenant only |
| **Employee / Field Staff** (`EMPLOYEE`, `EMPLOYEE_FIELD_STAFF`) | Tenant user | Mobile app | Own records only (attendance, visits, assigned faults) |
| **Customer** (portal user) | Separate `CustomerPortalUser` identity, **invite-only** (created by tenant staff against a Customer record) | Customer portal API (`/portal/*`) | Own account, connections, faults, service requests |

### 3.2 RBAC principles (business rules)

- Every permission is `MODULE:ACTION` with a data scope (`OWN` / `TEAM` / `ALL`).
- System roles ship with a default grant set; tenant admins can create custom
  roles and adjust grants — **capped by a Super-Admin-controlled ceiling** for
  sensitive modules (e.g. Connection Map employee access).
- Tenant isolation is absolute: no query, report, or export crosses tenants.
- Every mutation is audit-logged with tenant, user, and request IDs.

---

## 4. Business Requirements by Module

### Core Platform (Milestone 2)

| # | Module | Business requirement (what it must do) |
|---|---|---|
| 2.1 | **Authentication** | Email+password login with JWT access/refresh rotation; OTP login; Google sign-in; password reset via email; session list + remote revoke; login history; device binding (`x-device-id`); brute-force throttling (10/min). Tenant self-registration and employee onboarding flows. |
| 2.2 | **RBAC** | Permission catalog, system roles, custom tenant roles, per-permission data scopes, role management UI (`/dashboard/rbac/roles`). |
| 2.3 | **Multi-tenancy** | Tenant provisioning by Super Admin or self-serve registration; every business table scoped by tenant; tenant lifecycle (activate/suspend). |
| 2.4 | **User management** | Tenant admin creates/edits users, assigns roles, deactivates; employee profile with personal details, documents. |
| 2.5 | **White-label** | Per-tenant branding (logo, colors) delivered to mobile app via tenant config; mobile resolves tenant before login. |
| 2.6 | **Settings** | Tenant-level settings (geofences, working hours, leave policy) and platform-level settings (Super Admin). |
| 2.7 | **Security framework** | HTTPS-only, helmet headers, validation on every input, no stack traces to clients, audit logging, OWASP Top-10 alignment. |
| 2.8 | **Notification engine** | Template-based notifications; channels: in-app, email, FCM push, WhatsApp Cloud API (env-gated); default templates auto-provisioned per tenant. SMS channel planned. |
| 2.9 | **File management** | Uploads (photos, documents) to object storage (MinIO/OCI); files scoped to tenant. |
| 2.10 | **Master data** | Tenant-managed reference lists (e.g. areas, device types, categories) editable in admin portal (`/dashboard/master-data/:type`). |
| 2.11 | **Workflow engine** | Approvals framework (leave, claims, attendance corrections) with configurable approvers. |

### Business Modules (Milestone 3)

| # | Module | Business requirement |
|---|---|---|
| 3.1 | **Attendance** | Mobile GPS check-in/check-out with geofence validation; auto-checkout scheduler; attendance correction requests with approval; admin sees live logs and metrics; work-minute crediting feeds payroll. |
| 3.2 | **GPS Visit Management** | Planned and ad-hoc customer visits; on-site GPS verification; visit outcomes with photos/notes; admin visit log. |
| 3.3 | **Fault Management** | Customer faults (tickets) logged by staff or by customers via portal; assignment to field staff; visit attempts tracked; resolution, reopen, customer rating; SLA visibility for admins. |
| 3.4 | **Lead Management** | Field staff capture leads on mobile; admin CRM pipeline view (`/dashboard/crm/leads`). |
| 3.5 | **Reports & Analytics** | Role-scoped reports (attendance, visits, faults, payroll inputs) on web and mobile; exportable. |
| 3.6 | **Business notifications** | Event-driven notifications for the above modules (assignment, approval, SLA) through engine 2.8. |
| 3.7 | **Connection Map** | Network asset map (OLT/splitter/customer connections) on admin web (`/dashboard/network/map`) and mobile; employee visibility limited to assigned routes; Super-Admin ceiling caps what tenant admins may grant. |
| 3.8 | **Customer Portal** | Invite-only customer identity (separate from staff accounts); login via password or OTP; customers view account/connections, raise & track faults, comment, reopen, rate; browse service catalog (plans/addons); create/cancel service requests. Staff manage invites, catalog, and request queue. Portal **web/mobile UI and SMS channel are planned** — today this is API-complete (testable via Swagger). |
| — | **Payroll inputs** | Attendance-derived payroll view for admins (`/dashboard/finance/payroll`). |
| — | **Claims** | Employee expense claims from mobile; admin review (`/dashboard/finance/claims`). |
| — | **Leave** | Employee leave requests on mobile; balance tracking; admin approval queue (`/dashboard/workforce/leaves`). |
| — | **Device management** | Registered employee devices; admin can view/manage (`/dashboard/workforce/devices`). |
| — | **Billing / Subscriptions** | Platform subscription plans catalog; Super Admin manages tenant subscriptions (`/dashboard/platform/subscriptions`). |

---

## 5. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Availability | Single-region OCI deployment behind Caddy/Load Balancer; health endpoint `/api/v1/health`. |
| Performance | Paginated list endpoints; N+1-free queries; Redis caching (geofence, RBAC); tiered rate limiting. |
| Offline | Mobile app is offline-first: Hive cache, background sync, connectivity awareness; check-ins queue and sync. |
| Security | JWT rotation, argon2 password hashing, RBAC at API layer, tenant isolation on every query, secrets in OCI Vault, audit trail on all mutations. |
| Observability | Prometheus metrics + Grafana dashboards; structured JSON logs with `tenant_id`/`user_id`/`request_id`; Bull Board queue dashboard. |
| Data retention | Soft-delete only on business records (`deletedAt`); no hard deletes. |
| Compliance | OWASP Top 10; no PII in logs beyond IDs. |

---

## 6. Current Status & Known Gaps (for reviewer expectations)

**Done & testable today**

- All core-platform modules (2.1–2.11) and business modules 3.1–3.7 on web + mobile.
- Customer Portal (3.8) backend: identity/invites, faults, catalog, service requests — via Swagger/API.
- CI/CD, monitoring, production compose stack; deploy dry-run passed 16 Jul 2026.

**Gaps / planned**

| Gap | Impact on testing |
|---|---|
| Customer portal web/mobile UI | Customer role must be tested through Swagger (`/api/docs`) or API client |
| SMS notification channel | Only email/push/WhatsApp/in-app testable |
| Live OCI production deploy | Final go-live steps in `docs/GO_LIVE_PLAYBOOK.md`; until complete, "production" tests run against the deployed staging/production stack once up |
| WhatsApp channel | Env-gated pending Meta app approval |

---

## 7. Acceptance & Sign-off

A module is accepted when the corresponding suite in
**`docs/UAT_Manual_Test_Plan.md`** passes for every applicable role, on both
web and mobile where the feature has both surfaces, and the Product Owner signs
the sheet at the end of that document.
