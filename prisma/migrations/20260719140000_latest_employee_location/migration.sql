-- Current-position table for the live map: one row per employee, upserted on
-- every ping. Read path avoids a DISTINCT ON scan over the breadcrumb history.

CREATE TABLE "latest_employee_locations" (
  "employeeId"   TEXT NOT NULL,
  "tenantId"     TEXT NOT NULL,
  "latitude"     DOUBLE PRECISION NOT NULL,
  "longitude"    DOUBLE PRECISION NOT NULL,
  "accuracy"     DOUBLE PRECISION,
  "speed"        DOUBLE PRECISION,
  "batteryLevel" INTEGER,
  "capturedAt"   TIMESTAMP(3) NOT NULL,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "latest_employee_locations_pkey" PRIMARY KEY ("employeeId")
);

-- Live map lists on-duty operators per tenant, newest first.
CREATE INDEX "latest_employee_locations_tenantId_capturedAt_idx"
  ON "latest_employee_locations" ("tenantId", "capturedAt");

ALTER TABLE "latest_employee_locations"
  ADD CONSTRAINT "latest_employee_locations_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "latest_employee_locations"
  ADD CONSTRAINT "latest_employee_locations_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
