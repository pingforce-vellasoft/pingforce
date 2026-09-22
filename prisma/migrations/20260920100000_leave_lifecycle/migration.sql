BEGIN;
ALTER TABLE "leave_balances" ADD COLUMN "reservedDays" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "leave_requests"
  ADD COLUMN "duration" TEXT NOT NULL DEFAULT 'FULL_DAY',
  ADD COLUMN "requestedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "decisionReason" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Preserve historical calendar-day charges. New calendar policy is not retroactive.
UPDATE "leave_requests" SET "requestedDays" = ("endDate" - "startDate") + 1;
-- Fail closed on corrupt legacy records; reconcile these before deploying.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "leave_requests" WHERE "requestedDays" <= 0) THEN
    RAISE EXCEPTION 'Leave migration blocked: reversed legacy dates require reconciliation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "leave_requests" r WHERE r.status IN ('PENDING', 'APPROVED') AND r."deletedAt" IS NULL
    AND (EXTRACT(YEAR FROM r."startDate") <> EXTRACT(YEAR FROM r."endDate") OR NOT EXISTS (
      SELECT 1 FROM "leave_balances" b WHERE b."tenantId" = r."tenantId" AND b."employeeId" = r."employeeId"
      AND b."leaveTypeId" = r."leaveTypeId" AND b.year = EXTRACT(YEAR FROM r."startDate") AND b."deletedAt" IS NULL
    ))
  ) THEN RAISE EXCEPTION 'Leave migration blocked: active cross-year requests or missing balances require reconciliation';
  END IF;
END $$;
WITH pending AS (
  SELECT "tenantId", "employeeId", "leaveTypeId", EXTRACT(YEAR FROM "startDate")::INTEGER AS year,
    SUM("requestedDays") AS days
  FROM "leave_requests" WHERE status = 'PENDING' AND "deletedAt" IS NULL
  GROUP BY "tenantId", "employeeId", "leaveTypeId", EXTRACT(YEAR FROM "startDate")
)
UPDATE "leave_balances" b SET "reservedDays" = p.days, "usedDays" = b."usedDays" - p.days
FROM pending p WHERE b."tenantId" = p."tenantId" AND b."employeeId" = p."employeeId"
AND b."leaveTypeId" = p."leaveTypeId" AND b.year = p.year AND b."deletedAt" IS NULL;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balance_nonnegative"
  CHECK ("reservedDays" >= 0 AND "usedDays" >= 0 AND "availableDays" >= 0);
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_request_valid_duration"
  CHECK ("duration" IN ('FULL_DAY', 'FIRST_HALF', 'SECOND_HALF') AND "requestedDays" > 0);
CREATE TABLE "leave_ledger" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "requestId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL, "leaveTypeId" TEXT NOT NULL, "year" INTEGER NOT NULL,
  "action" TEXT NOT NULL, "days" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT, "updatedBy" TEXT, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "leave_ledger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "leave_ledger_tenantId_requestId_action_key" ON "leave_ledger"("tenantId", "requestId", "action");
CREATE INDEX "leave_ledger_tenantId_employeeId_year_idx" ON "leave_ledger"("tenantId", "employeeId", "year");
CREATE INDEX "leave_ledger_tenantId_leaveTypeId_idx" ON "leave_ledger"("tenantId", "leaveTypeId");
ALTER TABLE "leave_ledger" ADD CONSTRAINT "leave_ledger_requestId_tenantId_fkey"
  FOREIGN KEY ("requestId", "tenantId") REFERENCES "leave_requests"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
INSERT INTO "leave_ledger" (id, "tenantId", "requestId", "employeeId", "leaveTypeId", year, action, days, "updatedAt", "createdBy")
SELECT gen_random_uuid()::TEXT, "tenantId", id, "employeeId", "leaveTypeId", EXTRACT(YEAR FROM "startDate")::INTEGER,
  CASE WHEN status = 'PENDING' THEN 'LEGACY_RESERVED' ELSE 'LEGACY_APPROVED' END, "requestedDays", CURRENT_TIMESTAMP, "createdBy"
FROM "leave_requests" WHERE status IN ('PENDING', 'APPROVED') AND "deletedAt" IS NULL;
COMMIT;
