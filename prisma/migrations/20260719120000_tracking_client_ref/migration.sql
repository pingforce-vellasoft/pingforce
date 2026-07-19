-- Background location tracking: idempotency key for offline-synced pings.

-- Client-generated dedupe key so retried ping batches don't create duplicate rows.
ALTER TABLE "employee_locations" ADD COLUMN "clientRef" TEXT;

-- Idempotency: one row per (employee, clientRef). NULL clientRef allowed and not deduped
-- (Postgres treats NULLs as distinct in a unique index), preserving legacy rows.
CREATE UNIQUE INDEX "employee_locations_employeeId_clientRef_key"
  ON "employee_locations" ("employeeId", "clientRef");
