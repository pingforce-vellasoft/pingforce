# Business Requirements Document (BRD)

## Connection Map View — ISP/FTTH Network Visualization & Management

| Field             | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| **Document Type** | Business Requirements Document                                      |
| **Module**        | Connection Map (Network Management)                                 |
| **Product**       | PingForce — Workforce Management SaaS                               |
| **Version**       | 1.0 (Draft for review)                                              |
| **Date**          | 2026-07-16                                                          |
| **Prepared By**   | Engineering                                                         |
| **Audience**      | Product Owner, Business Team, Sales, Customer Success               |
| **Related Docs**  | [Implementation Plan](IMPLEMENTATION_PLAN.md) (technical companion) |

---

## 1. Executive Summary

PingForce today manages the _people_ side of ISP field operations — attendance, visits,
faults, and leads. It does not yet manage the _network_ side: where customers physically
connect, how connections branch from an OLTE (the fiber distribution point), and which
customers are affected when something breaks.

The **Connection Map** module adds an interactive, real-world map and network tree that
shows every OLTE and every connected customer, how they link together, and who is
responsible for them. It turns tribal knowledge ("Customer 9 is connected through
Customer 4's pole") into a managed, searchable, auditable asset.

**Why it matters commercially:** no comparable workforce-management product in our
target segment combines field-force management with FTTH network mapping. This module
is positioned as a **premium, subscription-gated differentiator** for ISP tenants.

---

## 2. Business Problem

ISP and FTTH operators — especially regional/rural providers — typically track their
network in spreadsheets, paper diagrams, or one senior technician's memory. This causes:

| Problem                                               | Business Impact                                                                                     |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| No visibility of network layout                       | Slow fault diagnosis; repeated site visits                                                          |
| Unknown downstream dependencies                       | Disconnecting one customer accidentally cuts off many; support teams cannot warn affected customers |
| No record of who installed what, where                | Disputes, rework, no accountability                                                                 |
| Onboarding new technicians is slow                    | Knowledge lives with individuals, not the system                                                    |
| Capacity of each OLTE unknown                         | Overselling ports, delayed installations                                                            |
| No link between customer records and physical network | CRM and field reality drift apart                                                                   |

---

## 3. Business Objectives & Success Metrics

| #   | Objective                                              | Success Metric (12 months post-launch)                                              |
| --- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| O1  | Give tenants full visibility of their physical network | 80% of active ISP tenants have ≥1 OLTE mapped                                       |
| O2  | Reduce fault resolution time                           | 25% reduction in average fault-to-fix time for tenants using the module             |
| O3  | Prevent accidental outages                             | 100% of disconnect/move actions show downstream-impact warning before confirmation  |
| O4  | Create a premium revenue stream                        | Module offered as paid add-on; attach rate ≥ 30% of ISP-segment tenants             |
| O5  | Reduce dependence on individual staff knowledge        | New technician can locate any customer connection via search/map without assistance |
| O6  | Full accountability                                    | Every network change traceable to a user, timestamp, and before/after state         |

---

## 4. Scope

### 4.1 In Scope (this release cycle)

1. **Geographic Map View** — real-world map (OpenStreetMap-based) showing OLTEs,
   customers, junctions, and the lines connecting them.
2. **Network Tree View** — collapsible logical tree of the same network (fast, ideal for
   support staff).
3. **OLTE Management** — create, update, view, archive OLTEs with location and port capacity.
4. **Connection Management** — create, modify, move, split, merge, disconnect, and
   reconnect customer connections, with full change history.
5. **Customer Pin Details** — click any customer on the map to see identity, status,
   parent connection, downstream count, assigned employee, and jump to their profile,
   billing (permission-based), service history, and documents.
6. **Search & Filters** — find any node by customer name/ID, mobile, connection ID,
   OLTE, area, village, mandal, district, employee, or status.
7. **Impact Analysis** — before disconnecting or moving a connection, the system shows
   how many downstream customers will lose service.
8. **Access Control & Feature Gating** — Super Admin switches the module on/off per
   tenant and sets the maximum access level for that tenant's employees; Tenant Admins
   manage employee permissions within that ceiling.
9. **Field App (second phase of rollout)** — technicians see assigned routes on mobile,
   capture GPS during installation, upload photos/documents, and update statuses —
   including offline in low-coverage areas.
10. **Network Health Dashboard (third phase)** — counts of active/faulty/pending
    connections, today's installs and faults, OLTE port utilization, plus bulk
    import/export of customer connection data.

### 4.2 Out of Scope (future roadmap, separate approval)

- Live signal monitoring from OLT hardware (SNMP/TR-069 telemetry)
- AI route suggestions, predictive fault detection, heat maps
- Offline map tiles on mobile
- Customer-facing map views
- GIS/KML data import

---

## 5. Stakeholders & User Roles

| Role                                            | Who                   | What they get                                                                                                              |
| ----------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Super Admin** (PingForce platform team)       | Us                    | Turns module on/off per tenant; sets tenant employee-access ceiling; basis for premium billing                             |
| **Tenant Admin** (ISP owner/manager)            | Customer's management | Full map of their network; manages OLTEs, connections, and which employees can do what                                     |
| **Employee** (field technician / support agent) | Customer's staff      | Sees assigned routes/customers, updates connections and statuses, onboards new customers — only within permissions granted |
| **End Customer** (subscriber)                   | Indirect beneficiary  | Faster installs and repairs; proactive outage communication                                                                |
| Product Owner                                   | Internal              | Prioritization, acceptance                                                                                                 |
| Sales / Customer Success                        | Internal              | Demo asset, upsell lever, onboarding driver                                                                                |

**Hard boundaries:** employees never see tenant configuration, subscription settings, or
other tenants' data. Tenants are fully isolated from each other.

---

## 6. Business Requirements

### BR-1: Network Visualization

| ID     | Requirement                                                                                                                      | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-1.1 | Display all OLTEs and connected customers as pins on a real-world map                                                            | Must     |
| BR-1.2 | Draw connection lines between OLTE → customer → customer, supporting branching (tree) layouts of any depth                       | Must     |
| BR-1.3 | Color-code pins by type/status: OLTE, junction, active, pending, suspended, disconnected, faulty — with an always-visible legend | Must     |
| BR-1.4 | Support zoom, pan, search, and map/tree view toggle                                                                              | Must     |
| BR-1.5 | Provide collapsible tree view with expand/collapse per branch                                                                    | Must     |
| BR-1.6 | Breadcrumb navigation (Dashboard > Network > OLTE > Customer)                                                                    | Should   |
| BR-1.7 | Remain responsive for tenants with 10,000+ mapped connections                                                                    | Must     |

### BR-2: Information on Demand

| ID     | Requirement                                                                                                                                                                          | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BR-2.1 | Clicking a customer pin shows: customer ID, name, status, address, connection type, parent connection, downstream customer count, installation date, assigned employee, last updated | Must     |
| BR-2.2 | Connection detail panel shows: connection ID, parent, children, cable type, fiber/core details, distance, status, remarks                                                            | Must     |
| BR-2.3 | One-click navigation from a pin to customer profile, service history, maintenance logs, installation photos/documents, and billing (only if the user's role permits)                 | Must     |
| BR-2.4 | Unified search across customer, connection, OLTE, geography, employee, and status fields                                                                                             | Must     |

### BR-3: Network Operations

| ID     | Requirement                                                                                                                        | Priority         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| BR-3.1 | Tenant Admins (and permitted employees) can create, update, and archive OLTEs; archiving is blocked while active connections exist | Must             |
| BR-3.2 | Authorized users can create, modify, move, split, merge, disconnect, and reconnect connections                                     | Must             |
| BR-3.3 | Any disconnect or move shows a confirmation with the number of downstream customers affected, before the change is applied         | Must             |
| BR-3.4 | Every change records who did it, when, and the previous state (full audit trail per connection)                                    | Must             |
| BR-3.5 | Customer records can be linked to connections whether imported or created manually                                                 | Must             |
| BR-3.6 | Bulk import/export of customers and connections (with validation preview)                                                          | Should (Phase 3) |

### BR-4: Access Control & Commercial Gating

| ID     | Requirement                                                                                 | Priority |
| ------ | ------------------------------------------------------------------------------------------- | -------- |
| BR-4.1 | Super Admin can enable/disable the module per tenant at any time (subscription-plan driven) | Must     |
| BR-4.2 | Super Admin sets each tenant's maximum employee access: none / view-only / edit / full      | Must     |
| BR-4.3 | Tenant Admin distributes employee permissions only within that ceiling                      | Must     |
| BR-4.4 | Employees can be restricted to their assigned customers/routes only                         | Must     |
| BR-4.5 | Complete tenant data isolation — no cross-tenant visibility under any condition             | Must     |

**Permission matrix** (summary — full matrix in Implementation Plan §6):

| Capability                               | Super Admin | Tenant Admin        | Employee                 |
| ---------------------------------------- | ----------- | ------------------- | ------------------------ |
| Enable/disable module, set tenant access | ✅          | ❌                  | ❌                       |
| Configure employee access                | ✅          | ✅ (within ceiling) | ❌                       |
| View map / connection details            | ✅          | ✅                  | ✅ if permitted          |
| Create/update OLTEs                      | ✅          | ✅                  | Optional                 |
| Archive OLTE, import data                | ✅          | ✅                  | ❌                       |
| Create/update connections                | ✅          | ✅                  | ✅ if permitted          |
| View all customers                       | ✅          | ✅                  | Assigned only (optional) |

### BR-5: Field Operations (Rollout Phase 2)

| ID     | Requirement                                                                                                                        | Priority         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| BR-5.1 | Technicians view assigned routes and customer locations on the mobile app                                                          | Must (Phase 2)   |
| BR-5.2 | GPS location captured during installation                                                                                          | Must (Phase 2)   |
| BR-5.3 | Photos (pole, cable, junction, premises, ONT) and documents (agreement, ID proofs, installation report) attachable to a connection | Must (Phase 2)   |
| BR-5.4 | Field updates work offline and sync automatically when connectivity returns                                                        | Must (Phase 2)   |
| BR-5.5 | Assigned employee notified when a route/installation is assigned or changed                                                        | Should (Phase 2) |

### BR-6: Monitoring & Insight (Rollout Phase 3)

| ID     | Requirement                                                                                           | Priority         |
| ------ | ----------------------------------------------------------------------------------------------------- | ---------------- |
| BR-6.1 | Health dashboard: total/active/faulty/pending/suspended connections, today's installations and faults | Must (Phase 3)   |
| BR-6.2 | OLTE capacity view: total ports, used, available, utilization %                                       | Must (Phase 3)   |
| BR-6.3 | Faults reported in the Fault module appear on the map on the affected connection                      | Must (Phase 3)   |
| BR-6.4 | Map reflects status changes without manual refresh                                                    | Should (Phase 3) |

---

## 7. Rollout Plan (Business View)

| Phase  | Name                    | Delivers                                                                                                               | Indicative Duration |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **M1** | Core Network Management | Map + tree views, OLTE & connection management, search, impact warnings, access control — full admin-portal experience | ~6 weeks            |
| **M2** | Field Operations        | Mobile app for technicians: routes, GPS, photos, documents, offline updates, notifications                             | ~4 weeks            |
| **M3** | Monitoring & Analytics  | Health dashboard, capacity planning, fault-map integration, live updates, bulk import/export                           | ~4 weeks            |
| **M4** | Intelligent Operations  | AI suggestions, heat maps, QR codes, offline maps — scoped separately after M3                                         | Future              |

M1 is independently sellable; each later phase adds upsell value.

---

## 8. Commercial Model (Proposal — for Product/Business decision)

- Module is **off by default**; enabled per tenant by Super Admin → natural fit for a
  paid add-on or higher subscription tier.
- Suggested packaging levers: enabled yes/no, employee access level (view/edit/full),
  and later phase features (mobile field ops, analytics) as tier steps.
- Uses OpenStreetMap by default — **no per-map usage fees**, so gross margin is not
  eroded as tenant networks grow. Premium map providers (e.g., Google Maps) can be
  offered later as a tenant-level upgrade.

> **Decision needed from Business team:** pricing/packaging of the add-on and which
> phases map to which subscription tiers.

---

## 9. Assumptions

1. Tenants can provide (or capture during installs) GPS coordinates for OLTEs and customers; the map is only as good as location data entered.
2. Existing PingForce customer records will be linked to connections — no duplicate customer database is created.
3. FTTH topology is a tree (each connection has one parent); ring/mesh topologies are out of scope.
4. Internet connectivity is required for map imagery in this release (offline map tiles are a Phase 4 item); data edits on mobile work offline.
5. English UI initially, consistent with the rest of the product.

## 10. Dependencies

- Existing PingForce customer management, RBAC, audit logging, file storage, and notification modules (all live).
- OpenStreetMap tile availability (free tier acceptable at launch scale; self-hosted tiles budgeted as contingency).
- Mobile phase depends on the existing PingForce field app release train.

## 11. Risks (Business)

| Risk                                                | Likelihood | Mitigation                                                                                             |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| Tenants lack accurate GPS data at onboarding        | High       | Phase 2 GPS capture during installs; bulk import with validation; Customer Success onboarding playbook |
| Feature under-adopted if launched without field app | Medium     | Sell M1+M2 as one story; pilot with 2–3 design-partner tenants                                         |
| Map usage costs if a tenant demands Google Maps     | Low        | OSM default; Google offered only as paid tenant upgrade                                                |
| Scope creep from the long enhancement wishlist      | Medium     | This BRD fixes scope to §4.1; everything else needs new approval                                       |

## 12. Acceptance Criteria (Business Sign-off)

Module is accepted for launch when:

1. A tenant admin can build and view the full example network (1 OLTE, 12 customers, branching) on both map and tree views.
2. Disconnecting a mid-tree customer shows the correct downstream-impact warning and count.
3. An employee with view-only access can see but not modify anything; with no access, the module is invisible to them.
4. Super Admin can switch the module off for a tenant and access ends immediately.
5. Every change made during acceptance testing appears in the connection's history with user and timestamp.
6. Search finds a customer by name, mobile, and connection ID and centers the map on them.
7. No tenant can see another tenant's network under any test condition.

## 13. Glossary

| Term                     | Meaning                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| **OLTE**                 | Optical Line Terminal Equipment — the operator-side distribution point a fiber network fans out from |
| **Connection**           | A single customer drop or splitter leg in the network tree                                           |
| **Junction/Splitter**    | A non-customer branching point where one fiber line splits to serve several downstream connections   |
| **Downstream customers** | All customers whose service depends on a given connection                                            |
| **Parent connection**    | The upstream node a connection is physically fed from                                                |
| **Tenant**               | A PingForce customer organization (an ISP); tenants are fully isolated from each other               |
| **ONT**                  | Optical Network Terminal — the device installed at the customer's premises                           |

---

_Technical design, data model, APIs, and delivery estimates: see the companion
[Implementation Plan](IMPLEMENTATION_PLAN.md)._
