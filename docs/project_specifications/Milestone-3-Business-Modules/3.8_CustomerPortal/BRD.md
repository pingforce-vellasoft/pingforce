# Business Requirements Document (BRD)

## Customer Portal — End-User Self-Service (Mobile App + Web)

| Field             | Value                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document Type** | Business Requirements Document                                                                                                                                                   |
| **Module**        | Customer Portal (End-User Self-Service)                                                                                                                                          |
| **Product**       | PingForce — Workforce Management SaaS                                                                                                                                            |
| **Version**       | 1.0 (Draft for review)                                                                                                                                                           |
| **Date**          | 2026-07-16                                                                                                                                                                       |
| **Prepared By**   | Engineering                                                                                                                                                                      |
| **Audience**      | Product Owner, Business Team, Sales, Customer Success                                                                                                                            |
| **Related Docs**  | [Technical Analysis](customer_portal_analysis.md) (technical companion), [Connection Map BRD](../3.7_ConnectionMap/BRD.md), [Fault Management](../3.3_FaultManagement/README.md) |

---

## 1. Executive Summary

PingForce today serves four personas — Super Admin, Tenant Admin, Manager, and Employee.
The people who ultimately pay the tenant — **the end customers (subscribers)** — have no
login. Every fault report, plan change, or add-on request reaches the tenant by phone
call, WhatsApp message, or a walk-in, and a staff member re-types it into the system.

The **Customer Portal** gives each tenant's customers their own login (mobile app first,
web in parallel) to raise faults, track resolution in real time, request plan changes,
add or remove add-ons, view their connections, and receive proactive notifications —
all branded as the tenant's own product (white-label).

**Why it matters commercially:**

- **Reduces tenant support load** — self-service replaces phone-call-and-retype for the
  highest-volume interactions (fault reporting, request status chasing).
- **Completes the loop** — PingForce already manages the fault engine, SLA clocks,
  technician visits, and (with 3.7) the physical network; the portal is the missing
  front door that lets the subscriber trigger and observe these engines directly.
- **Retention & upsell surface for tenants** — plan upgrades and add-on purchases become
  one-tap actions instead of sales calls.
- **Differentiator for PingForce sales** — "your subscribers get a branded app" is a
  strong pitch to ISP and facility-management prospects; positions the portal as a
  premium, subscription-gated module like Connection Map.

---

## 2. Business Problem

| Problem                                                              | Business Impact                                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Customers report faults by phone/WhatsApp only                       | Staff re-keying, lost reports, no timestamps, disputed SLAs                                  |
| No visibility of fault/request status for the customer               | Repeat "any update?" calls consume support time; customer frustration                        |
| Plan changes and add-on requests handled ad hoc                      | Slow revenue capture on upgrades; no audit trail; missed retention touchpoints on downgrades |
| No proactive outage/maintenance communication channel to subscribers | Complaint storms during planned maintenance; reputation damage for tenants                   |
| Tenant has no direct digital relationship with its subscribers       | No ratings/CSAT, no engagement channel, weaker customer stickiness                           |
| Every customer interaction requires a staff intermediary             | Support cost scales linearly with subscriber count                                           |

---

## 3. Business Objectives & Success Metrics

| #   | Objective                            | Success Metric (12 months post-launch)                                             |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| O1  | Shift fault intake to self-service   | ≥ 50% of faults for portal-enabled tenants raised via portal (vs phone)            |
| O2  | Cut "status update" support contacts | 30% reduction in inbound status-inquiry contacts for portal-enabled tenants        |
| O3  | Accelerate upgrade revenue           | Median plan-upgrade turnaround < 24h (request → active) for auto-approve tenants   |
| O4  | Create premium module revenue        | Portal offered as paid add-on; attach rate ≥ 40% of ISP-segment tenants            |
| O5  | Measurable service quality           | CSAT captured on ≥ 60% of portal-raised fault closures                             |
| O6  | Proactive communication              | 100% of planned maintenance events notifiable to affected subscribers before start |

---

## 4. Scope

### 4.1 In Scope (this release cycle)

1. **Invite-based onboarding** — staff (or the customer's primary contact) invites a
   subscriber contact by SMS/email/QR; the invite carries the tenant code; the app/web
   remembers the tenant after first activation.
2. **Customer login** — password and/or OTP login on a dedicated Flutter customer app
   (Android first) and a web portal (covers iOS and desktop from day one).
3. **Account & connections view** — profile, account details, list of the customer's
   connections with current plan, add-ons, and status.
4. **Fault register** — raise faults with photos, track status and customer-visible
   timeline, comment, reopen, and rate on closure.
5. **Service requests** — plan change, add-on add/remove, relocation, suspension,
   resumption, termination — each routed per tenant-configured approval policy.
6. **Technician visit visibility** — see scheduled visits for own faults/requests;
   confirm or ask to reschedule.
7. **Notifications** — push/SMS/email on every status change; tenant-broadcast outage
   and maintenance announcements.
8. **Multi-contact accounts** — one customer account, several portal users with
   lightweight roles (Owner / Member / Viewer); Owner manages contacts.
9. **Tenant configuration** — plan-change rules, per-request-type approval policy,
   billing display mode, all configurable per tenant with platform defaults.
10. **White-label branding** — tenant logo, colors, and product name throughout the
    app/portal; branding delivered at invite/login time.
11. **Commercial gating** — Super Admin enables/disables the portal module per tenant
    (subscription-driven), same model as Connection Map.

### 4.2 Out of Scope (future roadmap, separate approval)

- Online payment collection and full billing/invoicing engine (billing display is
  configuration-gated and inactive until a billing module exists)
- Usage dashboards (data consumption graphs) — requires OLT/RADIUS telemetry
- Customer-facing network map views (explicitly out of scope in 3.7 as well)
- Chat / AI assistant, WhatsApp bot channel
- Referral programs and loyalty
- iOS native build (same Flutter codebase, separate release cycle)
- Customer self-signup without invite

---

## 5. Stakeholders & User Roles

| Role                                                   | Who                                                            | What they get                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **End Customer — Owner** (subscriber, primary contact) | Tenant's paying customer                                       | Full self-service: faults, requests, visibility, manages other contacts on the account                  |
| **End Customer — Member**                              | Additional authorized contacts (family member, office manager) | Raise faults and requests, view status                                                                  |
| **End Customer — Viewer**                              | Read-only contacts (accountant, auditor)                       | View-only dashboards and history                                                                        |
| **Tenant Admin / Manager**                             | ISP/agency management                                          | Invites portal users, configures commercial rules, works the request approval queue                     |
| **Employee** (support agent / technician)              | Tenant staff                                                   | Receives portal-raised faults/requests through existing fault and visit workflows — no new app to learn |
| **Super Admin** (PingForce platform team)              | Us                                                             | Enables portal per tenant; basis for premium billing                                                    |
| Product Owner                                          | Internal                                                       | Prioritization, acceptance                                                                              |
| Sales / Customer Success                               | Internal                                                       | Demo asset ("your own branded subscriber app"), upsell lever                                            |

**Hard boundaries:** a portal user sees only their own customer account's data — never
another customer's, never staff screens, never tenant configuration. Customer identity
is a separate identity type; a customer login can never satisfy a staff permission
check. Tenants are fully isolated from each other.

---

## 6. Business Requirements

### BR-1: Onboarding & Access

| ID     | Requirement                                                                                                                                                                                                             | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-1.1 | Staff can invite a customer contact from the customer's detail screen via SMS and/or email; invite contains a deep link (app) and web link, optionally rendered as a QR code for on-site onboarding during installation | Must     |
| BR-1.2 | Invite is single-use and expires (default 7 days); staff can revoke or re-send; expired/revoked invites are clearly rejected at activation                                                                              | Must     |
| BR-1.3 | The invite carries the tenant identity; the customer never types a tenant ID — after first activation the app/web remembers the tenant (code + branding) for all future logins on that device                           | Must     |
| BR-1.4 | Activation flow: open invite → verify OTP to the invited phone/email → set password (optional if OTP-only login is chosen) → land on the home screen                                                                    | Must     |
| BR-1.5 | Login by phone + OTP or email/phone + password; forgot-password and OTP-resend flows included                                                                                                                           | Must     |
| BR-1.6 | Account Owner can invite/remove additional contacts on the account (within a per-tenant max, default 5) and assign their portal role                                                                                    | Must     |
| BR-1.7 | Staff can suspend or reset any portal user's access at any time; suspension takes effect on the next request (token invalidation)                                                                                       | Must     |
| BR-1.8 | On new device/reinstall, login requires tenant code + credentials; tenant code is visible in the original invite and on the profile screen                                                                              | Must     |
| BR-1.9 | Self-signup without an invite is not possible                                                                                                                                                                           | Must     |

### BR-2: Account, Connections & Plan Visibility

| ID     | Requirement                                                                                                                               | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-2.1 | Home dashboard: connection status at a glance, open faults, open requests, latest announcements                                           | Must     |
| BR-2.2 | Profile: view/edit own contact details (name, alternate phone, notification preferences); email/phone change requires OTP re-verification | Must     |
| BR-2.3 | Account view: customer code, legal/display name, account manager name and contact (click-to-call)                                         | Must     |
| BR-2.4 | Connections list: every connection on the account with plan name, speed/spec, price, status, installation address                         | Must     |
| BR-2.5 | Connection detail: current plan, active add-ons, activation date, plan history, pending changes ("upgrade scheduled for <date>")          | Must     |
| BR-2.6 | Browse tenant's plan catalog and add-on catalog with prices — read-only shop window, entry point for service requests                     | Must     |
| BR-2.7 | Document access: customer-visible documents attached to the account/connection (agreement copy, installation report)                      | Should   |

### BR-3: Fault Register (Self-Service Complaints)

| ID     | Requirement                                                                                                                                                                                                    | Priority           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| BR-3.1 | Raise a fault against a specific connection: category (from tenant's fault categories), description, photos (camera or gallery, up to N per fault)                                                             | Must               |
| BR-3.2 | Portal-raised faults enter the existing fault engine unchanged — SLA clocks, assignment, escalation all apply; channel recorded as PORTAL                                                                      | Must               |
| BR-3.3 | Fault list and detail: status, priority, SLA-derived "expected resolution by", assigned technician first name, customer-visible timeline                                                                       | Must               |
| BR-3.4 | Timeline entries are customer-visible only when staff marks them so; internal notes never leak to the customer                                                                                                 | Must               |
| BR-3.5 | Customer can add comments/photos to an open fault (e.g., "issue is back", additional evidence)                                                                                                                 | Must               |
| BR-3.6 | Customer can reopen a resolved fault within a tenant-configurable window (default 72h); reopen restarts the customer-communication loop                                                                        | Must               |
| BR-3.7 | On closure, customer is prompted to rate the resolution (1–5 + optional comment); rating visible to tenant management in reports                                                                               | Must               |
| BR-3.8 | Duplicate guard: when raising a fault, show the customer's own open faults on the same connection to discourage duplicates                                                                                     | Should             |
| BR-3.9 | If the tenant has declared an outage affecting the customer's area/OLTE (via 3.7), show an outage banner during fault creation ("known outage, ETA <time>") and allow "affected by this outage" one-tap report | Should (after 3.7) |

### BR-4: Service Requests (Plan & Add-On Lifecycle)

| ID      | Requirement                                                                                                                                                                                      | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BR-4.1  | Request plan change: pick target plan from catalog, see price difference and effective date per tenant's configured rules before confirming                                                      | Must     |
| BR-4.2  | Request add-on addition or removal on a connection; contract-locked add-ons show lock-in end date and route to approval                                                                          | Must     |
| BR-4.3  | Request relocation: new installation address (with map pin), preferred date; always routed to staff for feasibility                                                                              | Must     |
| BR-4.4  | Request temporary suspension and resumption within tenant policy limits (e.g., max days/year)                                                                                                    | Must     |
| BR-4.5  | Request termination; always routed to staff (retention + equipment recovery)                                                                                                                     | Must     |
| BR-4.6  | Every request gets a human-readable request number, a status (Submitted → Under Review → Approved → Scheduled → In Progress → Completed / Rejected / Cancelled), and a customer-visible timeline | Must     |
| BR-4.7  | Approval routing per request type follows the tenant's configured policy (auto / staff approval / auto-within-limits); customer sees "auto-confirmed" vs "awaiting approval" honestly            | Must     |
| BR-4.8  | Customer can cancel their own request while it is not yet In Progress                                                                                                                            | Must     |
| BR-4.9  | Staff work requests from a queue in the admin portal: list, filter, assign, approve/reject with reason (reason shown to customer), transition status                                             | Must     |
| BR-4.10 | Rejected requests always carry a customer-visible reason                                                                                                                                         | Must     |
| BR-4.11 | Completed plan/add-on changes update the connection record and its plan history automatically                                                                                                    | Must     |

### BR-5: Technician Visit Visibility

| ID     | Requirement                                                                                                 | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------- | -------- |
| BR-5.1 | Customer sees scheduled visits linked to their faults/requests: date window, purpose, technician first name | Must     |
| BR-5.2 | Customer can confirm availability or request reschedule (request goes to staff; no direct calendar control) | Should   |
| BR-5.3 | Customer is notified when the technician is assigned and when the visit is completed                        | Must     |

### BR-6: Notifications & Communication

| ID     | Requirement                                                                                                                                                       | Priority |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-6.1 | Push notification (app) plus SMS/email fallback on every customer-visible fault/request status change                                                             | Must     |
| BR-6.2 | Tenant staff can broadcast announcements (planned maintenance, outage, offers) to all customers or a segment (area/OLTE/plan); shown in-app and optionally pushed | Must     |
| BR-6.3 | Customer controls notification preferences per channel (push/SMS/email) where law/tenant policy allows; service-critical notices cannot be opted out              | Should   |
| BR-6.4 | Notification history screen in the app (last 90 days)                                                                                                             | Should   |

### BR-7: Billing Visibility (Configuration-Gated)

| ID     | Requirement                                                                                         | Priority                     |
| ------ | --------------------------------------------------------------------------------------------------- | ---------------------------- |
| BR-7.1 | Billing display mode is a per-tenant setting: None / Read-Only / Full; default None                 | Must                         |
| BR-7.2 | In Read-Only mode (when billing data exists): invoice list, dues summary, PDF download — no payment | Could (needs billing module) |
| BR-7.3 | In Full mode (future): online payment, receipts, auto-reminders                                     | Out of scope this cycle      |
| BR-7.4 | Plan/add-on prices shown in catalog and request confirmations regardless of billing mode            | Must                         |

### BR-8: Tenant Configuration & Commercial Gating

| ID     | Requirement                                                                                                                                                                                               | Priority |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-8.1 | Super Admin enables/disables the Customer Portal module per tenant (subscription-plan driven), same gating model as Connection Map                                                                        | Must     |
| BR-8.2 | Tenant Admin configures: plan-change effect (immediate / next-cycle / hybrid), proration mode, per-request-type approval policy and limits, reopen window, max contacts per account, billing display mode | Must     |
| BR-8.3 | Platform ships sensible defaults for all settings at tenant provisioning; every settings change is audit-logged                                                                                           | Must     |
| BR-8.4 | White-label: tenant logo, color scheme, and product name applied across app and web; branding fetched at invite verification and login                                                                    | Must     |
| BR-8.5 | Options that depend on unbuilt capabilities (proration, billing display) are visible but disabled with an explanatory hint                                                                                | Must     |

### BR-9: Security, Privacy & Audit

| ID     | Requirement                                                                                                                                                    | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-9.1 | Customer identity is a separate identity type; portal credentials can never access staff or admin functionality                                                | Must     |
| BR-9.2 | Every portal data access is scoped to the customer's own account; cross-customer access is impossible by construction and covered by automated isolation tests | Must     |
| BR-9.3 | All portal logins and mutations are audit-logged with tenant, customer, portal user, and request correlation IDs                                               | Must     |
| BR-9.4 | Rate limiting on auth endpoints (OTP request, login) to prevent abuse; OTP attempts capped                                                                     | Must     |
| BR-9.5 | Customer sees only customer-visible content: internal notes, staff names beyond first name, other customers' data, and network topology are never exposed      | Must     |
| BR-9.6 | Account Owner can see the list of portal users on their account and their last login                                                                           | Should   |
| BR-9.7 | Data deletion/anonymization of a portal user on request (soft delete + PII scrub), per privacy compliance                                                      | Should   |

---

## 7. Feature Summary by Persona (Quick Reference)

| Feature                                     | Owner | Member | Viewer |
| ------------------------------------------- | ----- | ------ | ------ |
| View dashboard, connections, plans, catalog | ✅    | ✅     | ✅     |
| Raise / comment / reopen faults             | ✅    | ✅     | ❌     |
| Rate fault resolution                       | ✅    | ✅     | ❌     |
| Raise / cancel service requests             | ✅    | ✅     | ❌     |
| Confirm / reschedule visits                 | ✅    | ✅     | ❌     |
| View invoices (when enabled)                | ✅    | ✅     | ✅     |
| Manage account contacts                     | ✅    | ❌     | ❌     |
| Edit own profile & notification prefs       | ✅    | ✅     | ✅     |

---

## 8. Rollout Plan (Business View)

| Phase | Name                  | Delivers                                                                                                                   | Depends On                           |
| ----- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| P1    | Identity & Onboarding | Invites, activation, login, contact management, white-label branding, module gating (BR-1, BR-8.1/8.4)                     | —                                    |
| P2    | Fault Register        | Customer fault raising/tracking/rating + notifications (BR-3, BR-6.1)                                                      | P1, existing 3.3                     |
| P3    | Catalog & Connections | Plans, add-ons, connection records and visibility (BR-2)                                                                   | Coordinate with 3.7 connection model |
| P4    | Service Requests      | Full request lifecycle + staff queue + tenant policy configuration (BR-4, BR-8.2/8.3)                                      | P3                                   |
| P5    | Frontends GA          | Flutter customer app (Android) + web portal, feature-complete for P1–P4                                                    | P1 (build starts in parallel)        |
| P6    | Engagement Layer      | Visits visibility, announcements/segments, notification prefs, billing read-only when available (BR-5, BR-6.2–6.4, BR-7.2) | P4                                   |

---

## 9. Assumptions & Dependencies

| #   | Assumption / Dependency                                                                                             | Impact if false                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| A1  | Connection/Plan/Add-on data model lands with or before 3.7 Connection Map work                                      | P3/P4 blocked; portal limited to faults + account view                   |
| A2  | Tenants maintain accurate customer contact data (phone/email) for invites                                           | Onboarding friction; invites undeliverable                               |
| A3  | SMS + email delivery channels are provisioned per tenant (existing 3.6 notifications infrastructure)                | OTP and invites cannot be delivered                                      |
| A4  | Billing module does not exist this cycle                                                                            | BR-7.2 stays disabled; proration options stay disabled                   |
| A5  | Play Store presence: one white-label app with runtime tenant branding (not one store listing per tenant) this cycle | Per-tenant store listings are a separate commercial/engineering decision |
| A6  | Fault categories and SLA policies are already configured per tenant (3.3)                                           | Portal fault form has no categories; SLA promises unavailable            |

---

## 10. Risks

| Risk                                                                   | Mitigation                                                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Low customer adoption (habit of calling)                               | QR onboarding during technician visits; staff prompt "track this in the app"; announcements only via app  |
| Duplicate/garbage fault reports                                        | Duplicate guard (BR-3.8), category-driven forms, per-customer open-fault limits                           |
| Tenant misconfigures approval policy (e.g., auto-approves termination) | Safe defaults; warning prompts on risky settings; audit log                                               |
| Internal notes leaking to customers                                    | Visibility flag is opt-in per timeline entry (default internal); code review + tests on visibility filter |
| OTP/SMS cost abuse                                                     | Rate limits, per-number caps, invite-only user base bounds the population                                 |
| Scope creep toward full billing                                        | Billing explicitly configuration-gated and out of scope; separate roadmap decision                        |

---

## 11. Open Items

None. All previously open decisions (tenant resolution, signup model, channel priority,
plan-change rules, approval routing, billing scope) are resolved — see
[Technical Analysis §9](customer_portal_analysis.md) — with commercial behavior made
**tenant-configurable** with platform defaults.
