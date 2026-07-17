# 3.7 Connection Map View — Implementation Plan

> **Module:** Connection Map (ISP/FTTH Network Visualization & Management)
> **Status:** Planned
> **Owner:** PingForce Engineering
> **Last Updated:** 2026-07-16
> **Related Specs:** 3.2 GPS Visit Management, 3.3 Fault Management, Milestone-2 RBAC/Multi-tenancy

---

## 1. Objective

Provide an interactive, geographic + logical network map that visualizes the complete
connection path from an OLTE to all connected customers. Supports linear and branching
(tree) topologies, multi-level customer-to-customer connections, and full lifecycle
management of OLTEs and connections — gated by Super Admin controlled, tenant-scoped RBAC.

This module is a key differentiator for ISP/FTTH tenants and must be delivered as an
optional, subscription-gated feature.

---

## 2. Scope Summary

| In Scope (this plan)                          | Out of Scope (future)                     |
| --------------------------------------------- | ----------------------------------------- |
| OLTE CRUD + archive                            | Live signal/OLT telemetry integration     |
| Connection tree (create/move/split/merge/etc.) | AI route optimization, fault prediction   |
| Geographic map view (Leaflet + OSM)            | GIS/KML import, fiber duct modeling       |
| Logical tree view (Angular CDK tree)           | Heat maps, revenue analytics              |
| Pin details, connection details, navigation    | Real-time OLT polling (SNMP/TR-069)       |
| Feature flag + 3-level RBAC                    | Customer-facing map                       |
| Impact analysis (downstream count)             | Version history / config restore (Phase 3)|
| Mobile (Flutter) read + field updates          | Offline map tiles (Phase 4)               |

---

## 3. Architecture Decisions

| Decision                | Choice                                                        | Rationale                                                                 |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Map library (Admin)     | **Leaflet.js + OpenStreetMap**                                | Free, no per-tenant licensing cost; SaaS-friendly. Provider abstraction layer so premium tenants can switch to Google Maps later. |
| Map library (Mobile)    | **flutter_map + OSM tiles**                                   | Same tile source, consistent behavior, no Google Maps SDK billing.        |
| Spatial storage         | **PostGIS `geography(Point, 4326)`** via Prisma `Unsupported` | Already used by `Geofence` and `AttendanceSession`; proven pattern in this repo. |
| Topology storage        | **Adjacency list (`parentConnectionId`) + materialized `path` column** | Adjacency list = simple writes; `path` (ltree-style string, e.g. `root.a.b`) = fast subtree reads without recursive CTE on every request. Recursive CTE used only on writes to rebuild paths. |
| Tree vs. graph          | **Strict tree** (one parent per connection)                   | FTTH splitter topology is a tree. Merge/split are modeled as re-parenting operations, not multi-parent edges. |
| New module vs. extend   | **New `network` NestJS module** (`apps/api/src/network/`)     | Own controllers/services/repos per CLAUDE.md module pattern; references existing `Customer`. |
| Customer linkage        | **Reuse existing `Customer` model**, do NOT duplicate         | `Customer` already has `parentCustomerId`; connection topology lives on the new `NetworkConnection` model, keyed to `customerId`. |
| Feature gating          | **`TenantSetting` key `network.connection_map.enabled`** + module permissions | Matches existing platform-setting/tenant-setting pattern; Super Admin toggles. |
| Realtime updates        | **Deferred to Phase 3** (WebSocket gateway)                   | MVP uses standard REST + client refresh; avoids premature Socket.IO infra. |

---

## 4. Data Model (Prisma)

All models follow mandatory columns (`id`, `tenantId`, `createdAt`, `updatedAt`,
`createdBy`, `updatedBy`, `deletedAt`) and tenant-scoped indexes.

### 4.1 `Olte`

```prisma
model Olte {
  id           String    @id @default(uuid())
  tenantId     String
  code         String              // e.g. OLTE-001, unique per tenant
  name         String
  description  String?
  status       String    @default("ACTIVE") // ACTIVE | MAINTENANCE | ARCHIVED
  totalPorts   Int       @default(0)
  usedPorts    Int       @default(0)        // denormalized counter, maintained in service
  address      String?
  area         String?
  village      String?
  mandal       String?
  district     String?
  location     Unsupported("geography(Point, 4326)")?
  metadata     Json?
  // + audit columns

  connections  NetworkConnection[]

  @@unique([tenantId, code])
  @@index([tenantId, status])
  @@map("oltes")
}
```

### 4.2 `NetworkConnection`

One row per customer drop / splitter leg. The topology backbone.

```prisma
model NetworkConnection {
  id                 String    @id @default(uuid())
  tenantId           String
  connectionCode     String              // CONN-xxxx, unique per tenant
  olteId             String
  customerId         String?             // null = junction/splitter node
  parentConnectionId String?             // null = directly off OLTE
  path               String              // materialized path: "<rootId>.<...>.<id>"
  depth              Int       @default(0)
  nodeType           String    @default("CUSTOMER") // CUSTOMER | JUNCTION | SPLITTER
  status             String    @default("ACTIVE")   // ACTIVE | PENDING_INSTALLATION | SUSPENDED | DISCONNECTED | FAULTY | MAINTENANCE
  connectionType     String?             // FIBER | COPPER | WIRELESS
  cableType          String?
  fiberCoreDetails   String?
  distanceMeters     Float?              // parent -> this node cable length
  installationDate   DateTime?
  assignedEmployeeId String?
  location           Unsupported("geography(Point, 4326)")?
  remarks            String?
  metadata           Json?
  // + audit columns

  olte             Olte                @relation(fields: [olteId], references: [id])
  parentConnection NetworkConnection?  @relation("ConnectionTree", fields: [parentConnectionId], references: [id])
  childConnections NetworkConnection[] @relation("ConnectionTree")

  @@unique([tenantId, connectionCode])
  @@index([tenantId, olteId])
  @@index([tenantId, customerId])
  @@index([tenantId, parentConnectionId])
  @@index([tenantId, status])
  @@index([tenantId, path])           // prefix scans for subtree queries
  @@map("network_connections")
}
```

### 4.3 `ConnectionHistory`

Append-only audit of topology mutations (supplements global `AuditLog` with
domain-specific before/after topology data).

```prisma
model ConnectionHistory {
  id             String   @id @default(uuid())
  tenantId       String
  connectionId   String
  action         String   // CREATED | MOVED | SPLIT | MERGED | DISCONNECTED | RECONNECTED | UPDATED | ARCHIVED
  previousParent String?
  newParent      String?
  previousOlte   String?
  newOlte        String?
  previousStatus String?
  newStatus      String?
  performedBy    String
  performedAt    DateTime @default(now())
  details        Json?

  @@index([tenantId, connectionId, performedAt])
  @@map("connection_history")
}
```

### 4.4 Migration notes

- Single migration `add_network_module` creating all three tables + GIST index on
  `location` columns (raw SQL in migration, same pattern as geofences):
  ```sql
  CREATE INDEX oltes_location_idx ON oltes USING GIST (location);
  CREATE INDEX network_connections_location_idx ON network_connections USING GIST (location);
  ```
- Seed: 1 demo OLTE + 12-node branching tree matching the spec example (for e2e + demos).

---

## 5. Backend (NestJS — `apps/api/src/network/`)

### 5.1 Module structure

```
src/network/
  network.module.ts
  olte/
    olte.controller.ts
    olte.service.ts
    olte.repository.ts
    dto/ (create-olte.dto.ts, update-olte.dto.ts, query-olte.dto.ts)
  connection/
    connection.controller.ts
    connection.service.ts
    connection.repository.ts
    topology.service.ts          // tree math: path rebuild, cycle detection, impact analysis
    dto/ (create-connection.dto.ts, update-connection.dto.ts, move-connection.dto.ts,
          split-connection.dto.ts, merge-connection.dto.ts, query-map.dto.ts)
  map/
    map.controller.ts            // read-optimized aggregate endpoints for map/tree rendering
    map.service.ts
```

### 5.2 API endpoints (`/api/v1/network/...`)

| Method | Path                                   | Permission                  | Notes |
| ------ | -------------------------------------- | --------------------------- | ----- |
| GET    | `/network/oltes`                       | `network:read`              | Paginated, filter by status/area |
| POST   | `/network/oltes`                       | `network:olte:create`       | |
| GET    | `/network/oltes/:id`                   | `network:read`              | Includes capacity stats |
| PATCH  | `/network/oltes/:id`                   | `network:olte:update`       | |
| DELETE | `/network/oltes/:id`                   | `network:olte:archive`      | Soft delete; blocked if active connections exist |
| GET    | `/network/oltes/:id/tree`              | `network:read`              | Full subtree (nested JSON), depth-limited param |
| GET    | `/network/map`                         | `network:read`              | GeoJSON FeatureCollection: OLTEs + connections + edges within bbox; `?bbox=`, `?olteId=`, `?status=` |
| GET    | `/network/connections/:id`             | `network:read`              | Detail incl. parent, children, customer summary |
| POST   | `/network/connections`                 | `network:connection:create` | |
| PATCH  | `/network/connections/:id`             | `network:connection:update` | Metadata/status/cable fields |
| POST   | `/network/connections/:id/move`        | `network:connection:move`   | Re-parent; transactional path rebuild |
| POST   | `/network/connections/:id/split`       | `network:connection:move`   | Insert junction node between parent and selected children |
| POST   | `/network/connections/:id/merge`       | `network:connection:move`   | Re-parent children to target, archive source node |
| POST   | `/network/connections/:id/disconnect`  | `network:connection:update` | Status → DISCONNECTED; returns downstream impact |
| POST   | `/network/connections/:id/reconnect`   | `network:connection:update` | |
| GET    | `/network/connections/:id/impact`      | `network:read`              | Downstream customer count + list ("12 customers will lose connectivity") |
| GET    | `/network/connections/:id/history`     | `network:read`              | ConnectionHistory timeline |
| GET    | `/network/search`                      | `network:read`              | Unified search: customer name/ID/mobile, connection code, OLTE, area/village/mandal/district, employee |
| GET    | `/network/stats`                       | `network:read`              | Health dashboard counts (total/active/faulty/pending/suspended, today's installs/faults) |

### 5.3 Topology service — invariants (unit-test targets)

1. **No cycles:** `move` rejects if target parent's `path` contains the moving node's id.
2. **Same tenant + same OLTE subtree:** parent and child must share `tenantId`; moving across OLTEs updates `olteId` for entire subtree.
3. **Path consistency:** every mutation rebuilds `path`/`depth` for the affected subtree inside one `prisma.$transaction`.
4. **Port accounting:** OLTE `usedPorts` recalculated on create/move/disconnect at root level.
5. **Soft delete only**; archive of a node with children requires explicit cascade choice (re-parent children or archive subtree).
6. **Every mutation writes `ConnectionHistory` + global `AuditLog`** with `tenant_id`, `user_id`, `request_id`.

### 5.4 Performance

- Map endpoint: bbox filter via PostGIS `ST_Intersects` on GIST index; cap response
  (default 2,000 nodes) and return `truncated: true` beyond it.
- Subtree reads: `WHERE path LIKE '<prefix>%'` (indexed) — no recursive CTE at read time.
- Cache `/network/stats` and OLTE capacity in Redis (60s TTL), invalidate on mutation
  (same pattern as existing geofence/RBAC caching from Phase 3).
- Pagination mandatory on all list endpoints.

---

## 6. RBAC & Feature Gating

### 6.1 Feature flag (Super Admin controlled)

- `PlatformSetting` / `TenantSetting` keys:
  - `network.connection_map.enabled` (per tenant)
  - `network.connection_map.employee_access` (per tenant: `NONE | VIEW | EDIT | FULL`)
- `NetworkFeatureGuard`: applied to all `/network/*` routes; returns 403 with standard
  error shape when flag off. Reads from cached tenant settings.

### 6.2 Permissions (seeded into `Permission` table)

| Permission                  | Super Admin | Tenant Admin | Employee (max grantable) |
| --------------------------- | ----------- | ------------ | ------------------------ |
| `network:read`              | ✅          | ✅           | ✅ (if permitted)        |
| `network:olte:create`       | ✅          | ✅           | Optional                 |
| `network:olte:update`       | ✅          | ✅           | Optional                 |
| `network:olte:archive`      | ✅          | ✅           | ❌                       |
| `network:connection:create` | ✅          | ✅           | ✅ (if permitted)        |
| `network:connection:update` | ✅          | ✅           | ✅ (if permitted)        |
| `network:connection:move`   | ✅          | ✅           | Optional                 |
| `network:import`            | ✅          | ✅           | ❌                       |
| `network:admin`             | ✅          | ✅           | ❌                       |

- Tenant Admin can grant employee permissions **only up to** the ceiling set by
  `network.connection_map.employee_access` — enforced in role-assignment service.
- **Assigned-only scoping:** employees without `network:read:all` see only connections
  where `assignedEmployeeId = user` (plus ancestors for context). Implemented via
  existing `UserScopeOverride` pattern.
- Guards: `@UseGuards(JwtAuthGuard, RbacGuard, NetworkFeatureGuard)` +
  `@RequirePermission(...)` per route.

---

## 7. Admin Portal (Angular 21 — `apps/admin/src/app/pages/network/`)

### 7.1 Structure

```
pages/network/
  network.routes.ts                 // lazy-loaded, guarded by AuthGuard + RoleGuard + featureFlagGuard
  network-map/
    network-map.component.ts        // smart: Leaflet map container
    map-legend.component.ts         // dumb
    node-popup.component.ts         // dumb: pin detail card
    connection-overlay.component.ts // dumb: connection detail side panel
  network-tree/
    network-tree.component.ts       // smart: CDK tree, expand/collapse, lazy children
  olte-management/
    olte-list.component.ts
    olte-form.component.ts          // reactive form
  connection-management/
    connection-form.component.ts
    move-connection-dialog.component.ts
    impact-warning-dialog.component.ts
  network-dashboard/
    network-dashboard.component.ts  // health stats tiles
  services/
    network-map.service.ts          // all HTTP; GeoJSON fetch by bbox
    olte.service.ts
    connection.service.ts
  models/
    olte.model.ts, connection.model.ts, map-node.model.ts
  map-providers/
    map-provider.token.ts           // abstraction: OSM default, Google pluggable later
    osm-tile.provider.ts
```

### 7.2 Key behaviors

- **Dual view toggle:** Map View ⇄ Tree View (persisted per user in localStorage).
- **Map:** Leaflet + OSM tiles; marker clustering (`leaflet.markercluster`) above 200
  visible nodes; polylines between parent/child; refetch on `moveend` by bbox (debounced).
- **Color coding + legend:** 🔵 OLTE, 🟣 Junction, 🟢 Active, 🟡 Pending, 🟠 Suspended,
  🔴 Disconnected, ⚫ Faulty. Legend panel component, always visible.
- **Pin popup:** customer ID/name/status, connection type, parent, downstream count,
  installation date, assigned employee, last updated → "View Details" button.
- **Connection overlay:** connection ID, parent, children list, cable type, fiber/core,
  distance, status, remarks; links to Customer Profile / Billing (permission-gated) /
  Service History / Faults.
- **Search bar:** unified `/network/search`, result click flies map to node + opens popup.
- **Breadcrumbs:** Dashboard > Network > OLTE-x > CONN-x.
- **Impact dialog:** before move/disconnect, call `/impact`, show "N downstream customers
  affected" confirmation.
- **Signals-first state**, all HTTP in services, standalone components, lazy route —
  per repo conventions.

---

## 8. Mobile (Flutter — `lib/features/network_map/`)

Phase M2 (after admin MVP). Clean architecture per feature:

```
features/network_map/
  domain/   entities (olte, network_connection), repositories, usecases
  data/     datasources (remote via dio, local via Hive), models, repository impl
  presentation/
    network_map_screen.dart        // flutter_map + OSM
    network_tree_screen.dart
    connection_detail_screen.dart
    network_map_notifier.dart / network_map_state.dart (Riverpod StateNotifier)
    widgets/ (node_marker.dart, legend_panel.dart, connection_card.dart)
```

- Employee-scoped: assigned connections only (API enforces).
- Field updates: status change, GPS capture on install (`location` update), photo upload
  via existing `FileAttachment` flow.
- Offline: Hive cache of assigned subtree; mutations through existing `OfflineQueue` +
  `SyncProvider`. Map tiles online-only in this phase.
- Wrapped in `OfflineAwareScaffold`; registered in `injection_container.dart` + `app_router.dart`.

---

## 9. Delivery Milestones

### M1 — Core Network Management (MVP) — ~3 sprints

| # | Task | Est. |
| - | ---- | ---- |
| 1.1 | Prisma models + migration + GIST indexes + seed tree | 2d |
| 1.2 | Olte CRUD (controller/service/repo/DTOs) + tests | 2d |
| 1.3 | TopologyService (path rebuild, cycle detection, impact) + tests | 3d |
| 1.4 | Connection CRUD + move/split/merge/disconnect/reconnect + history | 4d |
| 1.5 | Map + tree + search + stats endpoints (GeoJSON, bbox, caching) | 3d |
| 1.6 | Feature flag guard + permissions seed + employee-ceiling enforcement | 2d |
| 1.7 | Admin: map view (Leaflet, markers, polylines, clustering, legend, popup) | 4d |
| 1.8 | Admin: tree view + search + breadcrumbs + view toggle | 3d |
| 1.9 | Admin: OLTE + connection management forms, move/impact dialogs | 3d |
| 1.10 | Super Admin: tenant feature-flag UI | 1d |
| 1.11 | E2E tests (api-e2e): topology invariants, RBAC matrix, tenant isolation | 3d |

**Exit criteria:** spec's 12-node example fully creatable/renderable; move/disconnect
with impact warning works; employee with VIEW-only cannot mutate (e2e-proven); CI green.

### M2 — Field Operations — ~2 sprints

- Flutter map + tree screens, connection detail, status updates.
- GPS capture on installation; installation photos + documents (`FileAttachment`).
- Offline cache + sync for assigned routes.
- Notifications on assignment/route change (existing notification module).
- Distance auto-calculation (PostGIS `ST_Distance` parent↔child, editable override).

### M3 — Monitoring & Analytics — ~2 sprints

- Network health dashboard (Admin) + capacity planning (port utilization per OLTE).
- Fault module integration: fault on connection → node turns ⚫ on map; impact analysis
  surfaces downstream customers on fault creation.
- WebSocket gateway for live map status updates.
- Bulk import/export (CSV) of customers + connections with dry-run validation.
- Maintenance scheduler hooks (existing visit/fault infrastructure).

### M4 — Intelligent Operations — future

- AI parent-connection suggestions (distance/load/ports), heat maps, offline map tiles,
  QR codes per connection, route optimization. Separate spec when M3 ships.

---

## 10. Testing Strategy

| Layer | Coverage |
| ----- | -------- |
| Unit (API) | TopologyService: cycle detection, path rebuild on move/split/merge, impact counts, port accounting — 90%+ business logic |
| Unit (API) | Feature guard + permission ceiling logic |
| Integration | Repository queries: bbox GeoJSON, subtree by path prefix, tenant isolation (cross-tenant read must 404) |
| E2E (api-e2e) | Full RBAC matrix from §6.2; move/disconnect flows; feature-flag off → 403 |
| Admin | Component tests for tree expand/collapse, popup rendering; service tests for bbox fetch |
| Mobile | Notifier tests (state transitions), repository impl tests with mocked datasources |
| Load | Map endpoint with 10k-node tenant: p95 < 500ms with bbox + clustering |

---

## 11. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Large tenants (10k+ nodes) slow map render | Bbox-scoped fetch, server cap + clustering, materialized path (no recursive CTE reads) |
| Path column drift vs. actual parent links | Rebuild inside same transaction as parent change; nightly consistency check job (BullMQ) |
| OSM tile usage policy at scale | Self-hostable tile proxy noted; provider abstraction allows paid tiles per tenant |
| Prisma `Unsupported` geography ergonomics | Encapsulate all spatial reads/writes in repositories with typed raw queries (existing geofence pattern) |
| Merge/split semantics ambiguity | Modeled as re-parent operations with explicit ConnectionHistory records; ADR to be written before 1.3 |

---

## 12. As-Built Notes (M1, 2026-07-17)

M1 core is implemented. Deviations from the original design above:

| Planned | As built | Why |
| ------- | -------- | --- |
| PostGIS `geography(Point,4326)` columns on Olte/NetworkConnection | Plain `latitude`/`longitude` Float columns + btree index; bbox filtering in SQL on floats | Matches Geofence precedent; avoids `Unsupported` ergonomics at MVP scale. GIST/geography can be added later without API changes. |
| Permissions `network:olte:create/update/archive`, `network:connection:*`, `network:import`, `network:admin` | Catalog module `NETWORK` with actions `READ`, `READ_OWN`, `OLTE_MANAGE`, `CREATE`, `UPDATE`, `MOVE`, `DELETE` | Fits existing MODULE/ACTION catalog format and `@RequirePermission('NETWORK','…')` guard. Split/merge/move all under `MOVE`. |
| `TenantSetting` key-value keys `network.connection_map.*` | Typed columns `connectionMapEnabled`, `connectionMapEmployeeAccess` on `tenant_settings` | TenantSetting is a single typed row per tenant, not a KV store. |
| Separate super-admin flag UI page | Toggle card on existing Platform → Tenant Details page; API `GET/PATCH /network/access/:tenantId` guarded by platform-only `TENANTS` permission | Smaller surface, same control. |
| `leaflet.markercluster` | Plain circle markers + server-side 2 000-node cap with `truncated` flag | No extra dep needed at MVP scale; clustering slots in later. |
| CDK tree | Lightweight recursive standalone component | Fewer moving parts, same expand/collapse UX. |
| E2E suite (1.11) | Unit tests only so far: TopologyService (invariants) + NetworkFeatureGuard (access matrix), 21 tests | E2E RBAC matrix still owed before module DoD. |

Employee-ceiling enforcement inside role assignment (§6.2) and Redis stats caching (§5.4) are also still owed — tracked for M1 hardening.

## 12a. Definition of Done (module)

- [ ] All M1 exit criteria met
- [ ] Tenant isolation e2e-proven on every endpoint
- [ ] DTO validation on all inputs; no `any`
- [ ] Audit + ConnectionHistory on every mutation
- [ ] Swagger docs complete at `/api/docs`
- [ ] 90%+ coverage on TopologyService and permission logic
- [ ] ADR: topology storage + merge/split semantics
- [ ] Docs: this plan updated with as-built deviations
- [ ] CI green, Sonar clean, PO approval
