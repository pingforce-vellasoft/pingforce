-- Device binding at onboarding + admin-approved device replacement.
--
-- An employee is bound to exactly one handset. Binding happens once during
-- onboarding; afterwards only an admin/HR holder of DEVICE:APPROVE can move it,
-- via device_change_requests. Self-service re-binding was the fraud path: a
-- lent phone could re-register and punch attendance for a colleague.

-- 1. Device fingerprint on the binding row (DeviceManagement.md §6), so an
--    approver sees "Galaxy A54 / Android 14" rather than a raw hex device id.
ALTER TABLE "employee_devices" ADD COLUMN "deviceName" TEXT;
ALTER TABLE "employee_devices" ADD COLUMN "platform" TEXT;
ALTER TABLE "employee_devices" ADD COLUMN "osVersion" TEXT;
ALTER TABLE "employee_devices" ADD COLUMN "appVersion" TEXT;
ALTER TABLE "employee_devices" ADD COLUMN "model" TEXT;
ALTER TABLE "employee_devices" ADD COLUMN "manufacturer" TEXT;
ALTER TABLE "employee_devices" ADD COLUMN "revokedReason" TEXT;
ALTER TABLE "employee_devices"
  ADD COLUMN "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing rows were bound when they were created, not at migration time.
UPDATE "employee_devices" SET "boundAt" = "createdAt";

-- Rows already revoked before this migration have no recorded cause. Mark them
-- so the reason column is never silently empty for a revoked device.
UPDATE "employee_devices"
SET "revokedReason" = 'ADMIN_REVOKED'
WHERE "revokedAt" IS NOT NULL AND "revokedReason" IS NULL;

-- The hot lookup: "does this employee have an active binding?"
CREATE INDEX "employee_devices_tenantId_employeeId_isTrusted_idx"
  ON "employee_devices"("tenantId", "employeeId", "isTrusted");

-- 2. The hard onboarding gate. Null means "not yet bound" — the mobile
--    RouteGuard blocks the app, and attendance cannot be punched.
ALTER TABLE "employees" ADD COLUMN "deviceBoundAt" TIMESTAMP(3);

-- Backfill so live employees are not locked out at next app open: anyone who
-- already has a trusted device is treated as bound, dated from that binding.
UPDATE "employees" e
SET "deviceBoundAt" = d."boundAt"
FROM (
  SELECT DISTINCT ON ("employeeId") "employeeId", "boundAt"
  FROM "employee_devices"
  WHERE "isTrusted" = true AND "revokedAt" IS NULL
  ORDER BY "employeeId", "boundAt" DESC
) d
WHERE e."id" = d."employeeId";

-- 3. Tenant policy for how often a binding may be moved (DeviceManagement.md
--    §10). Bounds a serial "lost my phone" pattern instead of hiding it.
ALTER TABLE "tenant_settings"
  ADD COLUMN "deviceChangeRequestsPer90Days" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "tenant_settings"
  ADD COLUMN "deviceChangeRequestExpiryDays" INTEGER NOT NULL DEFAULT 7;

-- 4. The approval queue. Only path from one handset to the next.
CREATE TABLE "device_change_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "currentDeviceId" TEXT,
    "newDeviceId" TEXT NOT NULL,
    "newDeviceName" TEXT,
    "newPlatform" TEXT,
    "newOsVersion" TEXT,
    "newAppVersion" TEXT,
    "newModel" TEXT,
    "newManufacturer" TEXT,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "device_change_requests_pkey" PRIMARY KEY ("id")
);

-- Composite unique mirrors the DeviceTrackingExemption convention: it lets
-- every admin action key on (id, tenantId) so a request from another tenant
-- cannot be approved by guessing its id.
CREATE UNIQUE INDEX "device_change_requests_id_tenantId_key"
  ON "device_change_requests"("id", "tenantId");
CREATE INDEX "device_change_requests_tenantId_status_idx"
  ON "device_change_requests"("tenantId", "status");
CREATE INDEX "device_change_requests_employeeId_idx"
  ON "device_change_requests"("employeeId");
-- Serves the 90-day quota count.
CREATE INDEX "device_change_requests_tenantId_employeeId_createdAt_idx"
  ON "device_change_requests"("tenantId", "employeeId", "createdAt");

ALTER TABLE "device_change_requests"
  ADD CONSTRAINT "device_change_requests_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
