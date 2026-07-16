-- Phase 1 performance indexes (PERFORMANCE_AUDIT.md)

-- attendance_sessions: tenant-wide log listing sorted by punchIn,
-- and open-session lookups (punchOut IS NULL) for punch flow + auto-checkout
CREATE INDEX IF NOT EXISTS "attendance_sessions_tenantId_punchIn_idx"
  ON "attendance_sessions"("tenantId", "punchIn");
CREATE INDEX IF NOT EXISTS "attendance_sessions_employeeId_punchOut_idx"
  ON "attendance_sessions"("employeeId", "punchOut");
CREATE INDEX IF NOT EXISTS "attendance_sessions_tenantId_punchOut_idx"
  ON "attendance_sessions"("tenantId", "punchOut");

-- geofences: active-geofence lookup per tenant on every punch
CREATE INDEX IF NOT EXISTS "geofences_tenantId_active_idx"
  ON "geofences"("tenantId", "active");

-- offline_queue: sync workers scan by status in arrival order
CREATE INDEX IF NOT EXISTS "offline_queue_tenantId_syncStatus_createdAt_idx"
  ON "offline_queue"("tenantId", "syncStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "offline_queue_employeeId_syncStatus_idx"
  ON "offline_queue"("employeeId", "syncStatus");

-- PostGIS GiST spatial indexes: ST_DWithin geofence validation on every
-- punch currently sequential-scans; GiST makes it an index lookup
CREATE INDEX IF NOT EXISTS "geofences_location_gist_idx"
  ON "geofences" USING GIST ("location");
CREATE INDEX IF NOT EXISTS "attendance_sessions_location_gist_idx"
  ON "attendance_sessions" USING GIST ("location");
