-- 3.3 ATTEMPT_MANAGEMENT.md: per-fault field attempts (immutable once recorded)
-- CreateTable
CREATE TABLE "fault_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "faultId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "attemptType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "workNotes" TEXT,
    "nextAction" TEXT,
    "clientRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fault_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fault_attempts_tenantId_idx" ON "fault_attempts"("tenantId");

-- CreateIndex
CREATE INDEX "fault_attempts_tenantId_faultId_idx" ON "fault_attempts"("tenantId", "faultId");

-- CreateIndex
CREATE INDEX "fault_attempts_tenantId_technicianId_idx" ON "fault_attempts"("tenantId", "technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "fault_attempts_id_tenantId_key" ON "fault_attempts"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "fault_attempts_faultId_attemptNumber_key" ON "fault_attempts"("faultId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "fault_attempts_faultId_clientRef_key" ON "fault_attempts"("faultId", "clientRef");

-- AddForeignKey
ALTER TABLE "fault_attempts" ADD CONSTRAINT "fault_attempts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fault_attempts" ADD CONSTRAINT "fault_attempts_faultId_fkey" FOREIGN KEY ("faultId") REFERENCES "faults"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fault_attempts" ADD CONSTRAINT "fault_attempts_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

