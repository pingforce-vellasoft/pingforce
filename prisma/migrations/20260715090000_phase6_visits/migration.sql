-- Phase 6: GPS Visit Management (Milestone-3 3.2) + lead conversion (3.4)

-- Lead -> customer conversion traceability
ALTER TABLE "leads" ADD COLUMN "convertedCustomerId" TEXT;
ALTER TABLE "leads" ADD COLUMN "convertedAt" TIMESTAMP(3);
CREATE INDEX "leads_tenantId_convertedCustomerId_idx" ON "leads"("tenantId", "convertedCustomerId");
ALTER TABLE "leads" ADD CONSTRAINT "leads_convertedCustomerId_fkey" FOREIGN KEY ("convertedCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitNumber" TEXT NOT NULL,
    "visitType" TEXT NOT NULL DEFAULT 'PLANNED',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "customerId" TEXT,
    "employeeId" TEXT,
    "geofenceId" TEXT,
    "siteAddress" TEXT,
    "siteLatitude" DOUBLE PRECISION,
    "siteLongitude" DOUBLE PRECISION,
    "plannedStartAt" TIMESTAMP(3) NOT NULL,
    "plannedEndAt" TIMESTAMP(3),
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "startLatitude" DOUBLE PRECISION,
    "startLongitude" DOUBLE PRECISION,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "gpsValidated" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_status_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "notes" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "clientRef" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "visit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visits_tenantId_visitNumber_key" ON "visits"("tenantId", "visitNumber");
CREATE UNIQUE INDEX "visits_id_tenantId_key" ON "visits"("id", "tenantId");
CREATE INDEX "visits_tenantId_status_idx" ON "visits"("tenantId", "status");
CREATE INDEX "visits_tenantId_employeeId_idx" ON "visits"("tenantId", "employeeId");
CREATE INDEX "visits_tenantId_customerId_idx" ON "visits"("tenantId", "customerId");
CREATE INDEX "visits_tenantId_plannedStartAt_idx" ON "visits"("tenantId", "plannedStartAt");
CREATE INDEX "visits_tenantId_createdAt_idx" ON "visits"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "visit_status_history_id_tenantId_key" ON "visit_status_history"("id", "tenantId");
CREATE INDEX "visit_status_history_tenantId_visitId_idx" ON "visit_status_history"("tenantId", "visitId");
CREATE INDEX "visit_status_history_visitId_clientRef_idx" ON "visit_status_history"("visitId", "clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "visit_notes_id_tenantId_key" ON "visit_notes"("id", "tenantId");
CREATE INDEX "visit_notes_tenantId_visitId_idx" ON "visit_notes"("tenantId", "visitId");

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visits" ADD CONSTRAINT "visits_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visits" ADD CONSTRAINT "visits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visits" ADD CONSTRAINT "visits_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "geofences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_status_history" ADD CONSTRAINT "visit_status_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visit_status_history" ADD CONSTRAINT "visit_status_history_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
