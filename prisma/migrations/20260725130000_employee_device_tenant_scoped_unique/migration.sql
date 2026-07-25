-- pingforce:allow-destructive reason=The DELETE below only removes duplicate
-- (tenantId, deviceId) rows, keeping the newest per pair, and is required
-- before the composite unique index can be created. The previous global unique
-- on deviceId made such duplicates impossible, so on any database that ran
-- with that constraint this DELETE is expected to match zero rows. Devices are
-- re-registered automatically by the mobile client on next punch, so even an
-- unexpected match is self-healing and costs no user-visible data.
--
-- EmployeeDevice.deviceId was globally unique across every tenant. Device
-- identifiers are client-supplied, so one tenant's registration could collide
-- with another tenant's row: the resulting constraint violation surfaced as a
-- 409 and acted as a cross-tenant existence oracle for device identifiers.
-- Uniqueness belongs per tenant, matching how every lookup is now scoped.

-- Drop the global constraint. Prisma names single-column @unique constraints
-- "<table>_<column>_key".
ALTER TABLE "employee_devices"
  DROP CONSTRAINT IF EXISTS "employee_devices_deviceId_key";

-- Older databases may carry the same rule as a plain unique index instead.
DROP INDEX IF EXISTS "employee_devices_deviceId_key";

-- Collapse any pre-existing duplicates before the new constraint is applied.
-- A (tenantId, deviceId) pair can only legitimately have one row; keep the
-- most recently created and drop the rest, which are stale registrations from
-- before this constraint existed.
-- Ties on createdAt are broken by id so exactly one row always survives;
-- a plain "createdAt <" comparison would keep both and fail the index below.
DELETE FROM "employee_devices"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id",
           row_number() OVER (
             PARTITION BY "tenantId", "deviceId"
             ORDER BY "createdAt" DESC, "id" DESC
           ) AS rn
    FROM "employee_devices"
  ) ranked
  WHERE ranked.rn > 1
);

-- Same device id may now exist once per tenant, never twice within one.
CREATE UNIQUE INDEX "employee_devices_tenantId_deviceId_key"
  ON "employee_devices" ("tenantId", "deviceId");
