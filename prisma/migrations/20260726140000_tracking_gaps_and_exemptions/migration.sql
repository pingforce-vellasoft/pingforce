-- Tracking gaps + per-device tracking exemptions.
--
-- Purely additive: two new tables, no changes to existing ones. Background
-- location capture previously swallowed every failure identically, so an
-- employee switching location services off during a shift was indistinguishable
-- from a transient indoor GPS timeout — nothing was recorded and nobody was
-- told. A payroll or conduct dispute had no evidence either way.
--
-- tracking_gaps records those blackouts. device_tracking_exemptions relieves a
-- specific handset whose battery genuinely cannot sustain a shift of periodic
-- GPS fixes, granted by an admin after verifying the hardware.

-- 1. Tracking gaps ───────────────────────────────────────────────────────────
--
-- A gap opens on the first capture failure that is not a transient timeout and
-- closes when capture resumes, at check-out, or in the nightly auto-checkout
-- sweep. `endedAt IS NULL` means still ongoing.
CREATE TABLE "tracking_gaps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceSessionId" TEXT,
    -- LOCATION_DISABLED | PERMISSION_DENIED | SERVICE_STOPPED | FIX_TIMEOUT
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    -- Battery at gap start, when the device reported it. Evidence for an admin
    -- assessing a low-battery exemption request.
    "batteryLevel" INTEGER,
    "deviceId" TEXT,
    -- Set when an approved exemption covers this gap, so reviewed gaps stop
    -- resurfacing as exceptions on the attendance log.
    "isExcused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tracking_gaps_pkey" PRIMARY KEY ("id")
);

-- Composite unique on (id, tenantId): the tenant-scoping convention used
-- across business tables, so a foreign key can never cross tenants.
CREATE UNIQUE INDEX "tracking_gaps_id_tenantId_key"
  ON "tracking_gaps"("id", "tenantId");
CREATE INDEX "tracking_gaps_tenantId_idx" ON "tracking_gaps"("tenantId");
-- Serves the per-day gap lookup on the attendance log.
CREATE INDEX "tracking_gaps_employeeId_startedAt_idx"
  ON "tracking_gaps"("employeeId", "startedAt");
-- Serves "find the open gap for this employee" on close.
CREATE INDEX "tracking_gaps_tenantId_endedAt_idx"
  ON "tracking_gaps"("tenantId", "endedAt");

ALTER TABLE "tracking_gaps"
  ADD CONSTRAINT "tracking_gaps_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tracking_gaps"
  ADD CONSTRAINT "tracking_gaps_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Device tracking exemptions ──────────────────────────────────────────────
--
-- Scoped to a single handset so an exemption cannot follow the employee to a
-- replacement device, and expiring so it is re-justified rather than granted
-- forever. Deliberately not surfaced in the employee app: an easily
-- self-served exemption is an easy way to avoid being tracked at all.
CREATE TABLE "device_tracking_exemptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    -- LOW_BATTERY_HARDWARE | OEM_BACKGROUND_RESTRICTION | OTHER
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    -- PENDING | APPROVED | REJECTED | REVOKED
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "device_tracking_exemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_tracking_exemptions_id_tenantId_key"
  ON "device_tracking_exemptions"("id", "tenantId");
-- Serves the admin review queue filtered by status.
CREATE INDEX "device_tracking_exemptions_tenantId_status_idx"
  ON "device_tracking_exemptions"("tenantId", "status");
CREATE INDEX "device_tracking_exemptions_employeeId_idx"
  ON "device_tracking_exemptions"("employeeId");
-- Serves the per-capture "is this device exempt?" check.
CREATE INDEX "device_tracking_exemptions_tenantId_deviceId_idx"
  ON "device_tracking_exemptions"("tenantId", "deviceId");

ALTER TABLE "device_tracking_exemptions"
  ADD CONSTRAINT "device_tracking_exemptions_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "device_tracking_exemptions"
  ADD CONSTRAINT "device_tracking_exemptions_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
