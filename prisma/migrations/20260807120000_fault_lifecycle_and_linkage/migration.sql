-- Fault Management F1: taxonomy, lifecycle timestamps, SLA pause and linkage seams.

ALTER TABLE "faults" ADD COLUMN "category" TEXT;
ALTER TABLE "faults" ADD COLUMN "subCategory" TEXT;
ALTER TABLE "faults" ADD COLUMN "visitId" TEXT;
ALTER TABLE "faults" ADD COLUMN "connectionId" TEXT;
ALTER TABLE "faults" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "faults" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "faults" ADD COLUMN "reopenCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "faults" ADD COLUMN "slaPausedAt" TIMESTAMP(3);
ALTER TABLE "faults" ADD COLUMN "slaPausedMinutes" INTEGER NOT NULL DEFAULT 0;

-- Business-record metadata and soft deletion for tenant SLA policies.
ALTER TABLE "sla_policies" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sla_policies" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sla_policies" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "sla_policies" ADD COLUMN "updatedBy" TEXT;
ALTER TABLE "sla_policies" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "faults_tenantId_status_idx" ON "faults"("tenantId", "status");
CREATE INDEX "faults_tenantId_category_idx" ON "faults"("tenantId", "category");
CREATE INDEX "faults_tenantId_visitId_idx" ON "faults"("tenantId", "visitId");
CREATE INDEX "faults_tenantId_connectionId_idx" ON "faults"("tenantId", "connectionId");
CREATE INDEX "sla_policies_tenantId_deletedAt_idx" ON "sla_policies"("tenantId", "deletedAt");

-- Database-enforced idempotency for offline status replay. PostgreSQL permits
-- multiple NULL client refs, while rejecting duplicate non-null refs per fault.
DROP INDEX IF EXISTS "fault_timelines_faultId_clientRef_idx";
CREATE UNIQUE INDEX "fault_timelines_faultId_clientRef_key" ON "fault_timelines"("faultId", "clientRef");

-- Backfill lifecycle timestamps for faults that already reached a terminal
-- state, so SLA/CSAT reporting and the customer reopen window have a basis.
UPDATE "faults" SET "resolvedAt" = "updatedAt" WHERE "status" = 'RESOLVED' AND "resolvedAt" IS NULL;
UPDATE "faults" SET "closedAt" = "updatedAt" WHERE "status" = 'CLOSED' AND "closedAt" IS NULL;

-- Customer-facing attachment visibility, mirroring FaultTimeline.isCustomerVisible.
ALTER TABLE "file_attachments" ADD COLUMN "isCustomerVisible" BOOLEAN NOT NULL DEFAULT false;
