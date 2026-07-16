# PingForce — Dedicated Scalability Audit
> Based on deep code inspection of `pingforce_monorepo`  
> Audit Date: July 16, 2026  
> Scope: All three layers — NestJS API, Flutter Mobile, Angular Admin + PostgreSQL + Redis + Bull Queue

---

## Executive Scalability Summary

| Layer | Scalability Score | Bottleneck |
|---|---|---|
| **Database (PostgreSQL)** | 🟡 55/100 | No pool config, missing composite indexes, no partitioning, no read replica |
| **API Server (NestJS)** | 🟡 60/100 | Stateless ✅, but RBAC + geofence = 3–4 DB hits per request, no compression |
| **GPS / Attendance (Punch Flow)** | 🟡 65/100 | Transactional ✅, but geofence is uncached — full scan on every punch |
| **Background Jobs (Bull/BullMQ)** | 🔴 40/100 | Single queue, concurrency=1, no DLQ, no separate workers |
| **Mobile Sync Engine (Flutter)** | 🟡 55/100 | Sequential flush (no parallelism), no TTL, sync flood on reconnect |
| **Redis (Cache + Queue)** | 🟡 60/100 | No cluster config, no eviction policy, no memory limits defined |
| **Horizontal Pod Scaling** | 🟡 65/100 | Stateless API ✅, but scheduler will dual-fire without locking |
| **Multi-Tenancy at Scale** | 🟡 60/100 | Shared DB with tenant filters, no partition-per-tenant, hot tenants affect others |
| **Observability** | 🔴 25/100 | Pino logs only — no metrics, no tracing, no capacity visibility |

**Overall Scalability Rating: 55/100** — Viable for <500 field workers / 10 tenants. Needs work before 10,000+ users.

---

## Section 1 — Capacity Estimates (What Breaks and When)

Before diving into fixes, here's a load model based on the actual code paths.

### 1.1 The "Morning Rush" Attack Vector — 9 AM GPS Punch

This is the hardest load pattern for PingForce. All employees of a tenant clock in within a 15-minute window.

**Assumption:** Tenant with 500 field workers, all punching in between 9:00–9:15 AM.

```
500 punches / 15 min = ~33 punches/second (peak burst)
```

**What each punch does (from `handlers.ts` L33–150):**

```
1. prisma.employee.findUnique()          → 1 DB query
2. prisma.employeeDevice.findUnique()    → 1 DB query
3. prisma.$queryRaw (geofence PostGIS)  → 1 DB query (no cache)
4. prisma.$transaction:
   a. attendanceSession.findFirst()     → 1 DB query (15-min debounce)
   b. attendance.findFirst()            → 1 DB query
   c. attendance.create() (if new)      → 1 DB write
   d. attendanceSession.findFirst()     → 1 DB query (open session)
   e. attendanceSession.create/update() → 1 DB write
5. EventBus.publish(EmployeeCheckedIn) → 1 async Bull job
```

**Total: ~7–8 DB round-trips per punch**

```
33 punches/sec × 8 DB queries = 264 DB connections/sec
```

**Current DB pool max: 10 connections** (default `pg.Pool` — `prisma.module.ts` L40)

> 🔴 **This will exhaust the connection pool in under 1 second during a morning rush.** The API will start throwing `P2024: Connection pool timed out`.

The `DatabaseRetryInterceptor` handles `P2024` with backoff — so requests won't crash, they'll just retry and pile up, causing cascading slowdown. The user experience will be: punch button appears to hang for 5–15 seconds.

**Break-even point:** ~10 concurrent punch requests saturate the current setup.

---

### 1.2 GPS Location Tracking — Ongoing Load

`EmployeeLocation` model exists in the schema (`schema.prisma` L928–947). If GPS tracking fires every 30 seconds per field worker:

```
500 workers × 2 pings/min × 8 working hours = 480,000 location writes/day
```

The `EmployeeLocation` table:
- Has an index on `[employeeId, capturedAt]` ✅ — good
- Has no `TTL` or archival strategy — this table will hit **175M rows/year** per 500-user tenant
- No partitioning by month/date

At 10 tenants with 500 employees each = **1.75 billion rows/year** with no cleanup.

---

### 1.3 Report Generation — Aggregation Load

From `reports.service.ts` L84–106, the attendance report is a raw SQL aggregation:
```sql
SELECT e.id, COUNT(a.id), SUM(EXTRACT(EPOCH...))
FROM employees e
LEFT JOIN attendances a ON a.employeeId = e.id AND a.attendanceDate >= ? AND <= ?
LEFT JOIN attendance_sessions s ON s.attendanceId = a.id
WHERE e.tenantId = ? AND e.deletedAt IS NULL
GROUP BY e.id
```

For a tenant with 500 employees and 365 days of data:
- `attendances` table: 500 × 365 = **182,500 rows per tenant**
- `attendance_sessions` table: ~2 sessions/day × 500 × 365 = **365,000 rows per tenant**
- This JOIN with GROUP BY without a materialized view is an **O(n×m)** operation

At 10 tenants: 1.8M attendance + 3.65M session rows in a single shared table. The report query will do a full index scan of those rows.

**Cached?** Yes — 60s TTL on KPI dashboard (`KPI_CACHE_TTL_MS = 60_000` in `reports.service.ts` L15). ✅  
**Not cached?** The detailed attendance report, visits report, and export endpoints hit the DB on every call. ❌

---

## Section 2 — Database Scalability

### 2.1 🔴 Connection Pool — Critical (Code Evidence)

**File:** [`prisma.module.ts` L40](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/apps/api/src/prisma/prisma.module.ts#L40)

```typescript
const pool = new Pool({ connectionString });  // ← defaults: max=10, no timeout
```

`pg.Pool` defaults:
| Setting | Default | Should Be |
|---|---|---|
| `max` | `10` | `25–50` |
| `idleTimeoutMillis` | `10000` | `30000` |
| `connectionTimeoutMillis` | `0` (no timeout!) | `5000` |
| `keepAlive` | `false` | `true` |

With 10 connections and 8 DB queries per punch, you get **max ~1.25 concurrent punches** before queuing. At a 9 AM rush of 33 punches/second, the pool queue grows by ~31/second — it will overflow in seconds.

**Fix:**
```typescript
const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DB_POOL_MAX ?? '30'),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});
```

Also configure Prisma URL params:
```
DATABASE_URL=postgresql://...?connection_limit=30&pool_timeout=10&connect_timeout=10
```

---

### 2.2 🔴 Missing Critical Composite Indexes

From the schema, here are indexes that are missing for the most common query patterns:

**`AttendanceSession`** (`schema.prisma` L802–806):
```prisma
@@index([tenantId])                        ✅
@@index([attendanceId])                    ✅
@@index([tenantId, employeeId, punchIn])   ✅
// MISSING:
@@index([employeeId, punchOut])            ❌  ← every punch checks for open session
@@index([attendanceId, punchOut])          ❌  ← openSession check in PunchHandler L94
```

**`Geofence`** (`schema.prisma` L920–925):
```prisma
@@index([tenantId])                        ✅ (single column only)
// MISSING:
@@index([tenantId, active])               ❌  ← every punch filters WHERE tenantId AND active=true
```

**`Visit`** (`schema.prisma` L1100+):
```prisma
// MISSING composite indexes on:
@@index([tenantId, status, employeeId])   ❌  ← every visit list filter
@@index([tenantId, plannedStartAt])       ❌  ← date range queries in reports
```

**`OfflineQueue`** (`schema.prisma` L984–986):
```prisma
@@index([tenantId])                       ✅
// MISSING:
@@index([tenantId, syncStatus])           ❌  ← polling for PENDING items
@@index([employeeId, syncStatus])         ❌  ← per-employee queue query
```

**`EmployeeLocation`** — will grow fastest:
```prisma
@@index([tenantId])                       ✅ (missing!)
@@index([employeeId, capturedAt])         ✅
// MISSING:
@@index([tenantId, capturedAt])           ❌  ← date-range location queries in reports
```

**Fix — add to `schema.prisma`:**
```prisma
model AttendanceSession {
  @@index([employeeId, punchOut])
  @@index([attendanceId, punchOut])
}

model Geofence {
  @@index([tenantId, active])
}

model Visit {
  @@index([tenantId, status, employeeId])
  @@index([tenantId, plannedStartAt])
  @@index([tenantId, status])
}

model OfflineQueue {
  @@index([tenantId, syncStatus])
  @@index([employeeId, syncStatus])
}

model EmployeeLocation {
  @@index([tenantId, capturedAt])
}
```

---

### 2.3 🔴 `EmployeeLocation` Table — No Archival / Partitioning Strategy

This is the highest-growth table in the entire system. At 30-second GPS intervals for 500 employees:

```
500 employees × 2 pings/min × 60 min × 8 hours = 480,000 rows/day per tenant
```

**No partitioning, no archival, no TTL.**

After 1 year at 10 tenants: **~1.75 billion rows** in a single PostgreSQL table. Even with indexes, queries that cross date ranges will degrade as the table grows.

**Fix:** Add PostgreSQL table partitioning by month:
```sql
-- In a migration:
CREATE TABLE employee_locations (
  ...
  captured_at TIMESTAMPTZ NOT NULL,
  ...
) PARTITION BY RANGE (captured_at);

CREATE TABLE employee_locations_2026_07 
  PARTITION OF employee_locations
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

Also add a data retention policy (e.g., keep 90 days of raw pings, archive to cold storage after 1 year):
```sql
-- Scheduled cleanup (via cron job):
DELETE FROM employee_locations WHERE captured_at < NOW() - INTERVAL '90 days';
```

---

### 2.4 🟡 No Read Replica — All Reads Hit Primary

Every read query — reports, list endpoints, GPS logs, audit logs — hits the same PostgreSQL primary that handles all writes.

**Impact at scale:**
- Report aggregations (which do full table scans) compete with punch writes for DB I/O
- A slow report query can block or delay attendance punches

**Fix:** Add a read replica for read-heavy operations:
```typescript
// prisma.module.ts — split client
const writeClient = new PrismaClient({ adapter: new PrismaPg(writePool) });
const readClient  = new PrismaClient({ adapter: new PrismaPg(readPool) });

// Reports, search, exports use readClient
// Attendance punches, leave approvals use writeClient
```

OCI PostgreSQL supports read replicas out of the box.

---

### 2.5 🟡 Shared Multi-Tenant Tables — No Tenant Isolation at Scale

All tenants share the same tables (e.g., `attendances`, `employees`, `visits`). Tenant isolation is enforced at the query level via `WHERE tenantId = ?`.

**Risk at scale:**
- A large tenant (e.g., 5,000 employees) doing a report export runs a long transaction that holds row locks, potentially blocking smaller tenants.
- A hot tenant with many concurrent punches competes with other tenants for the shared connection pool.
- PostgreSQL VACUUM and AUTOVACUUM performance degrades as tables grow.

**Mitigation options (in order of effort):**
1. **Short-term:** Ensure every report query has a `LIMIT` and the large exports are done via Bull queue jobs (async background export) — not synchronous HTTP responses
2. **Medium-term:** Add per-tenant query timeouts via `SET LOCAL statement_timeout = '10s'` in transactions
3. **Long-term:** Schema-per-tenant using PostgreSQL schemas (very large effort, high isolation)

---

## Section 3 — API Server Scalability

### 3.1 🔴 RBAC Overhead — 2–3 DB Queries on Every Protected Route

**File:** [`rbac.service.ts` L53–85](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/apps/api/src/rbac/rbac.service.ts#L53-L85)

The good news: RBAC grants are Redis-cached with a 30-second TTL (`GRANTS_CACHE_TTL_MS = 30_000` L25). ✅

The bad news: `resolveScopeIds()` (called by nearly every list endpoint for data scoping) runs **2 additional DB queries** even when the grants are cached:

```typescript
// rbac.service.ts L182–205 — these hit DB even with cached grants:
const employee = await this.prisma.employee.findFirst({ ... });   // DB query
const members  = await this.prisma.employee.findMany({ ... });    // DB query (TEAM/BRANCH scope)
```

For a TEAM-scoped manager accessing `/attendance/logs`, this means:
1. Redis cache check (fast) ✅
2. `employee.findFirst()` — DB hit ❌
3. `employee.findMany()` (team members) — DB hit ❌

**Fix:** Cache the full `ResolvedDataScope` result (not just grants) with a per-user, per-module cache key:
```typescript
const scopeCacheKey = `scope:${userId}:${tenantId}:${module}`;
const cached = await this.cacheManager.get<ResolvedDataScope>(scopeCacheKey);
if (cached) return cached;
// ... compute and cache for 30s
await this.cacheManager.set(scopeCacheKey, scope, 30_000);
```

Invalidate on employee record change, team reassignment, or role change.

---

### 3.2 🔴 No Response Compression

**File:** [`main.ts`](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/apps/api/src/main.ts) — no `compression()` middleware

Large responses (employee lists, report exports, audit logs) are sent uncompressed. For field workers on 4G/LTE in India, this directly impacts load time.

**Typical uncompressed response sizes:**
| Endpoint | Approx. Size (JSON) | Gzip Saving |
|---|---|---|
| `GET /attendance/logs` (100 rows) | ~150 KB | ~85% → 22 KB |
| `GET /employees` (100 rows) | ~80 KB | ~80% → 16 KB |
| `GET /reports/visits` | ~50 KB | ~75% → 12 KB |
| `GET /audit-logs` (100 rows) | ~120 KB | ~82% → 22 KB |

**Fix:** (2 lines of code)
```typescript
// main.ts
import compression from 'compression';
app.use(compression({ threshold: 1024 })); // only compress responses > 1KB
```

---

### 3.3 🟡 Rate Limiting — Single Global Tier Will Cause Mass False Throttles

**File:** [`app.module.ts` L50–55](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/apps/api/src/app/app.module.ts#L50-L55)

```typescript
ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])
```

**Scenario:** Tenant with 500 employees all punching in at 9 AM.
- 500 requests in ~15 minutes = ~0.5 req/sec average — well under 100/min
- But the throttle is **global across all IP addresses, not per-tenant**
- If 500 employees all hit from the same NAT gateway IP (common in offices), they collectively share 1 bucket of 100 req/min — **80% of punches get throttled**

**Fix:** Use tenant-scoped throttling keyed on the JWT `tenantId`:
```typescript
// Custom ThrottlerStorage using Redis with tenant-based keys:
ThrottlerModule.forRootAsync({
  useFactory: () => ({
    throttlers: [
      { name: 'global',  ttl: 60000,    limit: 100  },
      { name: 'tenant',  ttl: 60000,    limit: 2000 }, // Per tenant
      { name: 'login',   ttl: 60000,    limit: 10   }, // Per IP on login
    ],
  }),
})
```

---

### 3.4 🟡 No API Gateway / Load Balancing Config

The app is designed for a single Node.js process. Node.js is single-threaded — CPU-intensive operations (JWT verification, PostGIS queries, report generation) block the event loop.

**Fix for horizontal scaling:**
```yaml
# docker-compose.prod.yml — 3 API replicas behind NGINX
api:
  deploy:
    replicas: 3
    resources:
      limits:
        cpus: '1.0'
        memory: 512M

nginx:
  config: |
    upstream api {
      least_conn;
      server api_1:3000;
      server api_2:3000;
      server api_3:3000;
    }
```

The API is already **stateless** (JWT-based auth, shared Redis, shared PostgreSQL) ✅ — it can scale horizontally without code changes. This is the single biggest piece of good design for scalability.

---

### 3.5 🟡 Punch Handler — 3 Queries Before Transaction

In `handlers.ts` L34–61, three queries run before the main `$transaction`:
1. `employee.findUnique()` — validate employee
2. `employeeDevice.findUnique()` — validate device trust
3. `$queryRaw` (PostGIS geofence check) — validate location

None of these are cached. On a high-punch morning:
- Employee record changes rarely → **cache for 5 minutes** (`employees:${userId}`)
- Device trust changes rarely → **cache for 1 hour** (`device:${deviceId}`)
- Geofences change rarely → **cache for 5 minutes** (`geofences:${tenantId}`)

This would reduce the punch from **8 DB queries → 2 DB queries** (the transaction writes only).

---

## Section 4 — GPS & Attendance Scalability

### 4.1 🔴 PostGIS Geofence — No Spatial Index on `location` Column

**File:** [`schema.prisma` L920](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/prisma/schema.prisma#L920)

```prisma
model Geofence {
  location Unsupported("geography(Point, 4326)")?
  
  @@index([tenantId])     ← regular B-tree index on tenantId
  // MISSING: GiST spatial index on location!
}
```

The punch handler uses `ST_DWithin(location, ...)` which benefits from a **GiST spatial index**. Without it, PostgreSQL does a sequential scan of all geofences per tenant on every punch.

**Fix — add migration:**
```sql
CREATE INDEX geofences_location_idx ON geofences USING GIST (location);
CREATE INDEX geofences_tenant_active_idx ON geofences (tenant_id, active) 
  WHERE active = true AND deleted_at IS NULL;
```

The `@@index` annotation in Prisma cannot create GiST indexes — this must be a raw SQL migration.

---

### 4.2 🟡 GPS Location Write Storm — No Batching

When `EmployeeLocation` tracking fires:
- Each location ping = 1 INSERT to the DB
- 500 employees × 30-second ping = 33 writes/second continuously throughout the workday

**No batching implemented.** Each mobile app sends individual HTTP requests for each GPS ping. This creates 33 separate DB insertions/second = ~2,000/minute of GPS writes alone, before any other operations.

**Fix — batch GPS writes:**
```typescript
// Mobile: accumulate 5 pings, send batch of 5 every 2.5 minutes
// API: single INSERT ... VALUES (row1), (row2), ... (row5)
await this.prisma.employeeLocation.createMany({
  data: locationBatch,
  skipDuplicates: true,
});
```

Alternatively, write GPS pings to Redis sorted sets (O(log n)) and flush to PostgreSQL in a scheduled job every 5 minutes — reducing DB write load by 10x.

---

### 4.3 🟡 `GpsValidationLog` — Unbounded Write, No TTL

**File:** [`schema.prisma` L950–967](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/prisma/schema.prisma#L950-L967)

Every GPS validation (geofence check on punch) writes a `GpsValidationLog` row. For 500 employees doing 2 punches/day:
```
500 × 2 × 365 = 365,000 rows/year per tenant
```

At 10 tenants: **3.65 million rows/year** with no retention policy. Indexes exist only on `tenantId` and `employeeId` — date-range queries will degrade.

**Fix:** Add `capturedAt` index + 90-day retention cron:
```prisma
model GpsValidationLog {
  @@index([tenantId, createdAt])
}
```
```typescript
@Cron('0 2 * * *') // 2 AM daily
async pruneGpsLogs() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await this.prisma.gpsValidationLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}
```

---

## Section 5 — Background Jobs (Bull Queue) Scalability

### 5.1 🔴 Single Queue, Concurrency = 1 (Default)

**File:** [`notifications.module.ts` L11](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/apps/api/src/notifications/notifications.module.ts#L11)

```typescript
BullModule.registerQueue({ name: 'notifications' })
// No defaultJobOptions, no concurrency, no separate queues
```

**Problems:**
1. `@Processor()` without `concurrency` defaults to **1 concurrent job** — the processor handles one email at a time
2. Email, SMS, and Push notifications all go to the same `notifications` queue — a slow email (SMTP timeout) blocks an urgent push notification
3. No `removeOnFail: false` — failed jobs are auto-removed, making debugging impossible
4. No separate priority lanes

**At scale scenario:** 500 employees, all get a shift reminder notification at 8:45 AM:
```
500 emails × 2 seconds each (SMTP) ÷ 1 concurrent = ~16 minutes to deliver all
```

Most employees will miss their reminder because delivery takes longer than the pre-shift window.

**Fix:**
```typescript
// Split into separate queues with concurrency:
BullModule.registerQueue({
  name: 'notifications-email',
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: false,    // ← Keep failed jobs for debugging
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
})

BullModule.registerQueue({ name: 'notifications-push' })
BullModule.registerQueue({ name: 'notifications-sms' })

// Processor with concurrency:
@Processor({ name: 'notifications-email', concurrency: 10 })
export class EmailProcessor { ... }

@Processor({ name: 'notifications-push', concurrency: 50 })  // Push is fast
export class PushProcessor { ... }
```

---

### 5.2 🔴 No Schedulers — Entire Background Processing Layer Missing

No `@nestjs/schedule` installed. Zero `@Cron` decorators anywhere in the codebase.

This means:
- No auto-checkout → employees left with open sessions permanently
- No daily attendance rollup → `Attendance.totalWorkMinutes` never updated by system
- No SLA breach detection → `SlaPolicy` model is orphaned; violations never flagged
- No session/token cleanup → `sessions` and `refresh_tokens` tables grow forever
- No payroll automation → payroll is fully manual-trigger-only
- No subscription enforcement → trial tenants never suspended

**At scale impact:** The `sessions` table grows by ~(daily active users × 2 sessions/day). For 5,000 users over 1 year = **3.65M session rows** with no cleanup. Session lookups will slow down as the table grows (index on `userId` and `expiresAt` ✅ — but the table still bloats).

**Fix (phased):**

```typescript
// scheduler.module.ts
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    AttendanceScheduler,
    SessionCleanupScheduler,
    SlaBreachScheduler,
    SubscriptionScheduler,
  ],
})
export class SchedulerModule {}
```

```typescript
// In multi-pod deployments, use redlock to prevent dual execution:
@Cron('0 23 * * *') // 11 PM daily
async autoCheckoutOpenSessions() {
  const acquired = await this.redlock.acquire(['lock:auto-checkout'], 60_000);
  try {
    // Run checkout logic
  } finally {
    await acquired.release();
  }
}
```

---

### 5.3 🟡 No Bull Board — Queue Health Invisible

There is no visibility into:
- How many jobs are waiting
- Which jobs have failed
- What the queue depth is over time
- Whether workers are keeping up

In production, a backed-up notification queue means customers miss alerts — with no observability, you won't know until customers complain.

**Fix:** Add Bull Board dashboard (protected behind admin auth):
```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(notificationsEmailQueue),
    new BullAdapter(notificationsPushQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', adminAuthMiddleware, serverAdapter.getRouter());
```

---

## Section 6 — Mobile Sync Scalability

### 6.1 🟡 Sequential Sync — O(n) Flush on Reconnect

**File:** [`sync_provider.dart` L238–284](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/apps/mobile/lib/core/sync/sync_provider.dart#L238-L284)

```dart
// Current — sequential: waits for each item before the next
for (var i = 0; i < pendingItems.length; i++) {
  await _syncItem(item);   // ← each item is awaited
}
```

**Scenario:** Employee is offline for 8 hours (field work in dead zone), accumulates 20 queued operations. On reconnecting:
- Each sync item takes ~300ms (mobile API latency)
- Sequential: 20 × 300ms = **6 seconds** before sync completes
- During this time, the app shows "Syncing..." and the employee may be stuck

**Fix:** Process items in parallel batches (respecting server rate limits):
```dart
// Process in batches of 5 concurrently:
const batchSize = 5;
for (int i = 0; i < pendingItems.length; i += batchSize) {
  final batch = pendingItems.skip(i).take(batchSize).toList();
  await Future.wait(batch.map(_syncItem));
}
```

---

### 6.2 🟡 Sync Flood — All Devices Reconnect Simultaneously

**Scenario:** Office WiFi drops and 500 employees are offline for 10 minutes. WiFi comes back, and all 500 devices trigger sync simultaneously within a 1-second window.

The current debounce is only 1 second (`sync_provider.dart` L54):
```dart
_syncDebounce = Timer(const Duration(seconds: 1), _flushQueue);
```

This means 500 devices all fire API calls at exactly t+1s:
```
500 devices × avg 3 queued items × 2 API calls = ~3,000 concurrent API requests in 1 second
```

The API's rate limiter (100 req/min global) would throttle almost all of these.

**Fix:** Add jitter to the reconnect sync delay:
```dart
// Jitter: random delay between 1–30 seconds after reconnect
final jitterMs = Random().nextInt(30000);
_syncDebounce = Timer(Duration(milliseconds: 1000 + jitterMs), _flushQueue);
```

This spreads 500 reconnect syncs over 30 seconds → ~17 devices/second → manageable load.

---

### 6.3 🟡 No Max Retry Limit — Infinite Loop Risk

**File:** [`sync_provider.dart` L230–234](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/apps/mobile/lib/core/sync/sync_provider.dart#L230-L234)

```dart
void clearFailed() {
  state = state.copyWith(
    queue: state.queue.where((i) => i.canRetry || i.errorMessage == null).toList(),
  );
}
```

`canRetry` is `true` if `retryCount < maxRetries`, but:
- Items that fail are marked with `errorMessage` and kept
- `retryItem()` just clears the `errorMessage` and re-flushes — **no actual max retry enforcement**
- If an item has a persistent server-side error (e.g., validation error), it loops indefinitely

**Fix:**
```dart
// In SyncQueueItem:
static const maxRetries = 5;
bool get canRetry => retryCount < maxRetries;

// In _flushQueue — skip exhausted items:
final pendingItems = state.queue
  .where((i) => !i.hasConflict && i.errorMessage == null && i.canRetry)
  .toList();

// Auto-clear after 5 failures:
if (!item.canRetry) {
  // Move to dead letter store or notify user
  markPermanentlyFailed(item.id);
}
```

---

### 6.4 🟡 No Stale Queue TTL

If an employee punches offline on Monday, and the app is unable to sync until Thursday — should Thursday's server accept a 3-day-old punch?

Currently: **yes**, because there's no TTL check on the Hive queue items.

**Potential impact:** 
- Attendance data manipulation — an employee could queue up old punches and replay them
- Data integrity issues — replaying old operations against state that has since changed

**Fix — add TTL validation on server-side sync endpoint:**
```typescript
// In offline sync handler:
const MAX_SYNC_AGE_HOURS = 48;
if (punch.timestamp < Date.now() - MAX_SYNC_AGE_HOURS * 3600 * 1000) {
  throw new BadRequestException('Sync payload too old — maximum 48 hours');
}
```

Also add client-side TTL:
```dart
// In _restoreQueue — skip items older than 48 hours:
final items = box.values
    .map(...)
    .where((item) => item.queuedAt.isAfter(
        DateTime.now().subtract(const Duration(hours: 48))
    ))
    .toList();
```

---

## Section 7 — Redis Scalability

### 7.1 🟡 No Eviction Policy or Memory Limits

**File:** [`app.module.ts` L69–73](file:///c:/Users/rahee/.gemini/antigravity/scratch/pingforce_monorepo/apps/api/src/app/app.module.ts#L69-L73)

```typescript
CacheModule.registerAsync({
  useFactory: async (config) => ({
    store: await redisStore({
      url: config.get('REDIS_URL', 'redis://localhost:6379'),
      // ← No maxMemory, no eviction policy, no TTL defaults
    }),
  }),
})
```

Without an eviction policy, Redis will fill up and then **reject all writes** (default behavior) — causing cache operations to throw errors and cascade to DB.

**Fix:** Configure Redis with eviction policy:
```
# redis.conf (or via OCI Redis config):
maxmemory 512mb
maxmemory-policy allkeys-lru    # Evict least-recently-used keys when full
```

Also add cache TTL defaults and size monitoring:
```typescript
redisStore({
  url: config.get('REDIS_URL'),
  ttl: 300,                // 5 minute default TTL for all keys
})
```

---

### 7.2 🟡 Single Redis Instance — No Cluster / Sentinel

Both `CacheModule` (application cache) and `BullModule` (job queues) share the same Redis instance:
```typescript
// app.module.ts L77:
BullModule.forRootAsync({
  useFactory: (config) => ({
    redis: config.get('REDIS_URL', 'redis://localhost:6379'),
  }),
})
```

**Risk:** If Redis goes down:
- All RBAC permission caches invalidate → every request hits DB until Redis comes back
- All Bull job queues stop processing → email/notification delivery halts
- All throttler state is lost → rate limiting effectively disabled temporarily

**Fix for production:**
- Use **Redis Sentinel** (OCI managed Redis supports this) for automatic failover
- Or **Redis Cluster** for both HA and horizontal scaling
- Separate Redis instances for cache vs. Bull queues (different failure domains)

```
REDIS_CACHE_URL=redis://cache-redis:6379
REDIS_QUEUE_URL=redis://queue-redis:6379
```

---

## Section 8 — Horizontal Scaling Plan

### 8.1 ✅ The API Is Already Stateless (Good Foundation)

- No in-process session state
- JWT tokens are self-contained (no server-side session lookup needed for auth)
- All shared state in PostgreSQL or Redis
- RBAC grants in Redis cache (shared across pods)
- Bull queues in Redis (shared across pods)

This means you can run **N identical API pod replicas** behind a load balancer without sticky sessions.

### 8.2 🔴 Schedulers Will Dual-Fire in Multi-Pod Setup

Without `@nestjs/schedule` + Redis locking:
- If you run 3 API pods and each has a `@Cron` job for auto-checkout
- All 3 pods will fire the cron at the same time → 3 auto-checkouts for each employee

**Fix:** Use `redlock` (Redis-based distributed lock):
```typescript
import Redlock from 'redlock';

@Cron('0 23 * * *')
async autoCheckoutOpenSessions() {
  const lock = await this.redlock.acquire(['cron:auto-checkout'], 60_000);
  try {
    await this.attendanceScheduler.runAutoCheckout();
  } finally {
    await lock.release();
  }
}
```

Alternatively, run the scheduler as a **dedicated worker pod** (not part of API replicas):
```yaml
# docker-compose.prod.yml
scheduler:
  image: pingforce-api
  command: node dist/apps/api/src/scheduler-worker.js
  deploy:
    replicas: 1   # ← Always exactly 1 scheduler pod
```

---

### 8.3 Kubernetes HPA Configuration (Target Setup)

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: pingforce-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: pingforce-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

```yaml
# k8s/deployment.yaml
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "512Mi"
```

At these limits, each pod handles ~50–100 concurrent requests. With HPA, 10 pods = ~500–1,000 concurrent requests.

---

## Section 9 — Observability (Pre-Requisite for Scaling)

**You cannot scale what you cannot measure.** Currently there is zero metrics instrumentation.

### 9.1 What You Can't See Right Now

| Missing Metric | Impact |
|---|---|
| API p95/p99 request latency | Don't know if punch is taking 200ms or 5s |
| DB connection pool utilization | Don't know when pool will exhaust |
| Redis memory usage | Don't know when cache will fill up |
| Bull queue depth | Don't know if emails are backing up |
| Error rate by endpoint | Can't see which endpoints are failing |
| GPS punch success rate | Can't see geofence failures at scale |

### 9.2 Minimum Observability Stack

```typescript
// 1. Prometheus metrics endpoint
npm install @willsoto/nestjs-prometheus prom-client

// Key metrics to instrument:
- http_request_duration_ms (histogram by route, status)
- db_query_duration_ms (histogram by model, operation)
- bull_queue_depth (gauge by queue name)
- redis_cache_hit_rate (counter: hits vs misses)
- attendance_punch_duration_ms (histogram)
- geofence_check_duration_ms (histogram)
```

```typescript
// 2. Distributed tracing (OpenTelemetry)
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node

// Traces: API request → RBAC check → DB query → cache miss → DB query → response
// Instantly shows where time is spent on each request
```

```typescript
// 3. Bull Board for queue visibility
// (as described in Section 5.3)
```

---

## Section 10 — Scalability Fix Priority Roadmap

### 🔥 Sprint 1 — Must Fix Before Any Load (Week 1)

| # | Fix | File | Effort |
|---|---|---|---|
| 1 | Configure `pg.Pool` with `max=30`, `idleTimeout`, `connectionTimeout` | `prisma.module.ts` | 15 min |
| 2 | Add `compression()` middleware | `main.ts` | 5 min |
| 3 | Add missing composite DB indexes (6 indexes) | `schema.prisma` | 30 min |
| 4 | Add GiST spatial index on `Geofence.location` via raw migration | new migration | 20 min |
| 5 | Set Redis `maxmemory` + `allkeys-lru` eviction policy | Redis config | 10 min |

### 🚀 Sprint 2 — Before 100 Concurrent Users (Week 2)

| # | Fix | File | Effort |
|---|---|---|---|
| 6 | Cache geofences, employee, and device trust in `PunchHandler` | `handlers.ts` | 2 hrs |
| 7 | Cache `resolveScopeIds()` full result (not just grants) | `rbac.service.ts` | 1 hr |
| 8 | Split Bull queue into email/push/sms + set `concurrency` | `notifications.module.ts` | 1 hr |
| 9 | Add `@nestjs/schedule` + auto-checkout + session cleanup crons | new `scheduler.module.ts` | 3 hrs |
| 10 | Add jitter to mobile sync reconnect delay | `sync_provider.dart` | 15 min |

### 📈 Sprint 3 — Before 1,000 Concurrent Users (Week 3–4)

| # | Fix | File | Effort |
|---|---|---|---|
| 11 | `EmployeeLocation` table partitioning by month | new migration | 2 hrs |
| 12 | GPS location write batching (5 pings/batch) | Mobile + API | 4 hrs |
| 13 | Add Prometheus metrics instrumentation | new `metrics.module.ts` | 4 hrs |
| 14 | Add Bull Board dashboard (admin-protected) | `app.module.ts` | 1 hr |
| 15 | Add GPS/location data retention cron (90-day TTL) | scheduler | 1 hr |
| 16 | Add sync item TTL (48-hour max age) | Mobile + API | 2 hrs |
| 17 | Parallel batch sync in Flutter (`Future.wait`) | `sync_provider.dart` | 1 hr |

### 🏗️ Month 2 — Production Scale (5,000+ Users)

| # | Fix | Effort |
|---|---|---|
| 18 | PostgreSQL read replica for reports/search | Infra (OCI) |
| 19 | Redis Sentinel or Cluster for HA | Infra |
| 20 | Kubernetes HPA config (2–10 replicas) | k8s YAML |
| 21 | Dedicated scheduler pod (separate from API pods) | Docker/k8s |
| 22 | Async report export via Bull queue (not sync HTTP) | `reports.controller.ts` |
| 23 | Per-tenant query timeout (`SET LOCAL statement_timeout`) | `prisma.module.ts` |
| 24 | Tenant-scoped throttling (Redis TTL per tenantId) | `throttler.module.ts` |
| 25 | Load testing with k6 (500 concurrent GPS punches) | Test scripts |

---

## Section 11 — Breaking Points Summary

| Load Level | Will Break | Fix Required First |
|---|---|---|
| **10 concurrent punches** | DB connection pool exhaustion | Pool config (Fix #1) |
| **50 req/sec sustained** | Event loop saturation (no compression) | Compression (#2) + Read replica |
| **100 employees reconnecting** | Sync flood overwhelms rate limiter | Jitter on sync (#10) |
| **500 employees morning rush** | Pool + throttler + geofence scan | Fixes #1–8 |
| **1 year of GPS data** | `employee_locations` table scan degrades | Partitioning (#11) |
| **Multi-pod deployment** | Scheduler dual-fires | Redlock + dedicated scheduler pod (#21) |
| **Redis fills up** | Cache writes throw errors → DB overload | Eviction policy (#5) |
| **Report + punch at same time** | DB I/O contention, punch latency spikes | Read replica (#18) |
