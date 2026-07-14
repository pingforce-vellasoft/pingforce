-- Phase 3: data-layer hardening

-- Money columns: Float (double precision) -> DECIMAL(12,2)
ALTER TABLE "salary_structures"
  ALTER COLUMN "basicPay" TYPE DECIMAL(12,2) USING "basicPay"::numeric(12,2),
  ALTER COLUMN "hra" TYPE DECIMAL(12,2) USING "hra"::numeric(12,2),
  ALTER COLUMN "specialAllowance" TYPE DECIMAL(12,2) USING "specialAllowance"::numeric(12,2),
  ALTER COLUMN "standardDeductions" TYPE DECIMAL(12,2) USING "standardDeductions"::numeric(12,2);

ALTER TABLE "payslips"
  ALTER COLUMN "grossPay" TYPE DECIMAL(12,2) USING "grossPay"::numeric(12,2),
  ALTER COLUMN "totalDeductions" TYPE DECIMAL(12,2) USING "totalDeductions"::numeric(12,2),
  ALTER COLUMN "netPay" TYPE DECIMAL(12,2) USING "netPay"::numeric(12,2);

ALTER TABLE "expense_categories"
  ALTER COLUMN "maxLimit" TYPE DECIMAL(12,2) USING "maxLimit"::numeric(12,2);

ALTER TABLE "expense_claims"
  ALTER COLUMN "amount" TYPE DECIMAL(12,2) USING "amount"::numeric(12,2);

-- EmployeeDevice: tenant ownership + audit columns
ALTER TABLE "employee_devices" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "employee_devices" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "employee_devices" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "employee_devices" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "employee_devices" ADD COLUMN "updatedBy" TEXT;

-- Backfill tenantId from the owning employee, then enforce NOT NULL
UPDATE "employee_devices" d
SET "tenantId" = e."tenantId"
FROM "employees" e
WHERE d."employeeId" = e."id" AND d."tenantId" IS NULL;

ALTER TABLE "employee_devices" ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "employee_devices_tenantId_idx" ON "employee_devices"("tenantId");

-- RefreshToken: allow SuperAdmin ownership (userId now optional)
ALTER TABLE "refresh_tokens" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "refresh_tokens" ADD COLUMN "superAdminId" TEXT;

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_superAdminId_fkey"
  FOREIGN KEY ("superAdminId") REFERENCES "super_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "refresh_tokens_superAdminId_idx" ON "refresh_tokens"("superAdminId");
