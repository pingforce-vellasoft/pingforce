-- Daily consolidated location summary: one small row per employee per day
-- (field-time + top dwell places), replacing long-term raw ping storage.

CREATE TABLE "daily_location_summaries" (
  "id"             TEXT NOT NULL,
  "tenantId"       TEXT NOT NULL,
  "employeeId"     TEXT NOT NULL,
  "day"            DATE NOT NULL,
  "minutesInField" INTEGER NOT NULL,
  "firstFixAt"     TIMESTAMP(3) NOT NULL,
  "lastFixAt"      TIMESTAMP(3) NOT NULL,
  "pointCount"     INTEGER NOT NULL,
  "topPlaces"      JSONB NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_location_summaries_pkey" PRIMARY KEY ("id")
);

-- One summary per employee per day (idempotent re-runs upsert on this).
CREATE UNIQUE INDEX "daily_location_summaries_employeeId_day_key"
  ON "daily_location_summaries" ("employeeId", "day");

-- Tenant reporting: list an employee's / tenant's days.
CREATE INDEX "daily_location_summaries_tenantId_day_idx"
  ON "daily_location_summaries" ("tenantId", "day");

ALTER TABLE "daily_location_summaries"
  ADD CONSTRAINT "daily_location_summaries_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_location_summaries"
  ADD CONSTRAINT "daily_location_summaries_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
