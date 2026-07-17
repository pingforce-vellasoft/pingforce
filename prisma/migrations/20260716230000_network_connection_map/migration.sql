-- 3.7 Connection Map module (docs/project_specifications/Milestone-3-Business-Modules/3.7_ConnectionMap)

-- Tenant-level feature gating (Super Admin controlled)
ALTER TABLE "tenant_settings"
  ADD COLUMN "connectionMapEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "connectionMapEmployeeAccess" TEXT NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "oltes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "totalPorts" INTEGER NOT NULL DEFAULT 0,
    "usedPorts" INTEGER NOT NULL DEFAULT 0,
    "address" TEXT,
    "area" TEXT,
    "village" TEXT,
    "mandal" TEXT,
    "district" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "oltes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionCode" TEXT NOT NULL,
    "olteId" TEXT NOT NULL,
    "customerId" TEXT,
    "parentConnectionId" TEXT,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "nodeType" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "connectionType" TEXT,
    "cableType" TEXT,
    "fiberCoreDetails" TEXT,
    "distanceMeters" DOUBLE PRECISION,
    "installationDate" TIMESTAMP(3),
    "assignedEmployeeId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "remarks" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "network_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousParent" TEXT,
    "newParent" TEXT,
    "previousOlte" TEXT,
    "newOlte" TEXT,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "connection_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oltes_tenantId_code_key" ON "oltes"("tenantId", "code");
CREATE UNIQUE INDEX "oltes_id_tenantId_key" ON "oltes"("id", "tenantId");
CREATE INDEX "oltes_tenantId_status_idx" ON "oltes"("tenantId", "status");

CREATE UNIQUE INDEX "network_connections_tenantId_connectionCode_key" ON "network_connections"("tenantId", "connectionCode");
CREATE UNIQUE INDEX "network_connections_id_tenantId_key" ON "network_connections"("id", "tenantId");
CREATE INDEX "network_connections_tenantId_olteId_idx" ON "network_connections"("tenantId", "olteId");
CREATE INDEX "network_connections_tenantId_customerId_idx" ON "network_connections"("tenantId", "customerId");
CREATE INDEX "network_connections_tenantId_parentConnectionId_idx" ON "network_connections"("tenantId", "parentConnectionId");
CREATE INDEX "network_connections_tenantId_status_idx" ON "network_connections"("tenantId", "status");
CREATE INDEX "network_connections_tenantId_path_idx" ON "network_connections"("tenantId", "path");
CREATE INDEX "network_connections_tenantId_assignedEmployeeId_idx" ON "network_connections"("tenantId", "assignedEmployeeId");
CREATE INDEX "network_connections_tenantId_latitude_longitude_idx" ON "network_connections"("tenantId", "latitude", "longitude");

CREATE INDEX "connection_history_tenantId_connectionId_performedAt_idx" ON "connection_history"("tenantId", "connectionId", "performedAt");

-- Prefix scans for subtree queries ("path LIKE 'a.b.%'") need a pattern-ops index
CREATE INDEX "network_connections_path_pattern_idx" ON "network_connections"("path" text_pattern_ops);

-- AddForeignKey
ALTER TABLE "oltes" ADD CONSTRAINT "oltes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "network_connections" ADD CONSTRAINT "network_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "network_connections" ADD CONSTRAINT "network_connections_olteId_fkey" FOREIGN KEY ("olteId") REFERENCES "oltes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "network_connections" ADD CONSTRAINT "network_connections_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "network_connections" ADD CONSTRAINT "network_connections_parentConnectionId_fkey" FOREIGN KEY ("parentConnectionId") REFERENCES "network_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "connection_history" ADD CONSTRAINT "connection_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
