-- Employee ↔ geofence assignment.
--
-- Until now geofence enforcement was tenant-wide: the punch path asked "is this
-- coordinate inside ANY active geofence of the tenant", so an employee hired for
-- the North branch could legitimately punch at the South branch. This table
-- scopes attendance to the sites an employee is actually assigned to.
--
-- Enforcement is strict — an employee with zero live assignments cannot punch
-- anywhere (GEOFENCE-001). That makes the backfill in step 3 mandatory rather
-- than cosmetic: without it every existing employee would be locked out on the
-- deploy that ships this migration.

-- 1. Assignment table ────────────────────────────────────────────────────────
CREATE TABLE "employee_geofences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- User id of the admin who made the assignment. Null for rows created by
    -- the backfill below, which is how a migrated grant is told apart from a
    -- deliberate one during an audit.
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "employee_geofences_pkey" PRIMARY KEY ("id")
);

-- A pair exists at most once. Unassigning soft-deletes the row and re-assigning
-- revives it, so this constraint holds across the soft-delete lifecycle instead
-- of accumulating one dead row per toggle.
CREATE UNIQUE INDEX "employee_geofences_employeeId_geofenceId_key"
    ON "employee_geofences"("employeeId", "geofenceId");

CREATE INDEX "employee_geofences_tenantId_idx" ON "employee_geofences"("tenantId");
-- Serves the punch hot path (assignments for one employee) and the geofence
-- roster screen (employees for one geofence) respectively.
CREATE INDEX "employee_geofences_tenantId_employeeId_idx" ON "employee_geofences"("tenantId", "employeeId");
CREATE INDEX "employee_geofences_tenantId_geofenceId_idx" ON "employee_geofences"("tenantId", "geofenceId");

ALTER TABLE "employee_geofences"
    ADD CONSTRAINT "employee_geofences_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_geofences"
    ADD CONSTRAINT "employee_geofences_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_geofences"
    ADD CONSTRAINT "employee_geofences_geofenceId_fkey"
    FOREIGN KEY ("geofenceId") REFERENCES "geofences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Tenant toggle ───────────────────────────────────────────────────────────
--
-- Default false: one geofence per employee, which is the common case and the
-- stricter one. Tenants whose staff cover several sites turn it on.
ALTER TABLE "attendance_policies"
    ADD COLUMN "allowMultipleGeofencesPerEmployee" BOOLEAN NOT NULL DEFAULT false;

-- 3. Backfill ────────────────────────────────────────────────────────────────
--
-- Reproduces the pre-migration permission set exactly: every live employee was
-- previously valid at every live geofence of their tenant, so grant precisely
-- that. Behaviour is unchanged on deploy day and admins narrow it afterwards.
--
-- Note this deliberately ignores `allowMultipleGeofencesPerEmployee`. That flag
-- constrains what an admin may newly assign; retroactively applying it here
-- would mean picking one geofence arbitrarily per employee and silently
-- revoking the rest, locking people out of sites they legitimately worked
-- yesterday. Existing breadth is preserved and narrowed deliberately.
INSERT INTO "employee_geofences" ("id", "tenantId", "employeeId", "geofenceId", "assignedAt", "assignedBy", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    e."tenantId",
    e."id",
    g."id",
    CURRENT_TIMESTAMP,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "employees" e
JOIN "geofences" g
    ON g."tenantId" = e."tenantId"
   AND g."deletedAt" IS NULL
   AND g."active" = true
WHERE e."deletedAt" IS NULL
  AND e."employmentStatus" = 'ACTIVE';
