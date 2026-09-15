-- Attendance punch integrity and tenant-configurable GPS enforcement.
ALTER TABLE "attendance_sessions"
  ADD COLUMN "checkOutDeviceSignature" TEXT;

ALTER TABLE "attendance_policies"
  ADD COLUMN "gpsAccuracyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "allowLowAccuracy" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowOfflineCheckIn" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "outsideGeofencePolicy" TEXT NOT NULL DEFAULT 'BLOCK',
  ADD COLUMN "mockLocationPolicy" TEXT NOT NULL DEFAULT 'BLOCK';

CREATE INDEX "attendance_sessions_tenantId_deviceSignature_idx"
  ON "attendance_sessions"("tenantId", "deviceSignature");
CREATE INDEX "attendance_sessions_tenantId_checkOutDeviceSignature_idx"
  ON "attendance_sessions"("tenantId", "checkOutDeviceSignature");
