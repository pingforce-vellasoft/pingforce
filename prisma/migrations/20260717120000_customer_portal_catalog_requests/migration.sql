-- AlterTable
ALTER TABLE "network_connections" ADD COLUMN     "installationAddress" TEXT,
ADD COLUMN     "servicePlanId" TEXT;

-- CreateTable
CREATE TABLE "service_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "speedSpec" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "service_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addons" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_addons" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "connection_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "connectionId" TEXT,
    "requestNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "payload" JSONB NOT NULL,
    "requestedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_request_timelines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planChangeEffect" TEXT NOT NULL DEFAULT 'HYBRID',
    "prorationMode" TEXT NOT NULL DEFAULT 'NONE',
    "billingDisplayMode" TEXT NOT NULL DEFAULT 'NONE',
    "duesBlockAutoApproval" BOOLEAN NOT NULL DEFAULT false,
    "approverQueueMode" TEXT NOT NULL DEFAULT 'ACCOUNT_MANAGER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "portal_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_request_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'APPROVAL',
    "limits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "service_request_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_plans_tenantId_isActive_idx" ON "service_plans"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "service_plans_id_tenantId_key" ON "service_plans"("id", "tenantId");

-- CreateIndex
CREATE INDEX "addons_tenantId_isActive_idx" ON "addons"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "addons_id_tenantId_key" ON "addons"("id", "tenantId");

-- CreateIndex
CREATE INDEX "connection_addons_tenantId_connectionId_idx" ON "connection_addons"("tenantId", "connectionId");

-- CreateIndex
CREATE INDEX "connection_addons_tenantId_addOnId_idx" ON "connection_addons"("tenantId", "addOnId");

-- CreateIndex
CREATE INDEX "connection_addons_tenantId_status_idx" ON "connection_addons"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "connection_addons_id_tenantId_key" ON "connection_addons"("id", "tenantId");

-- CreateIndex
CREATE INDEX "service_requests_tenantId_customerId_idx" ON "service_requests"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "service_requests_tenantId_status_idx" ON "service_requests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "service_requests_tenantId_assignedToId_idx" ON "service_requests"("tenantId", "assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_tenantId_requestNumber_key" ON "service_requests"("tenantId", "requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_id_tenantId_key" ON "service_requests"("id", "tenantId");

-- CreateIndex
CREATE INDEX "service_request_timelines_tenantId_serviceRequestId_idx" ON "service_request_timelines"("tenantId", "serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "portal_settings_tenantId_key" ON "portal_settings"("tenantId");

-- CreateIndex
CREATE INDEX "service_request_policies_tenantId_idx" ON "service_request_policies"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "service_request_policies_tenantId_requestType_key" ON "service_request_policies"("tenantId", "requestType");

-- CreateIndex
CREATE INDEX "network_connections_tenantId_servicePlanId_idx" ON "network_connections"("tenantId", "servicePlanId");

-- AddForeignKey
ALTER TABLE "service_plans" ADD CONSTRAINT "service_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addons" ADD CONSTRAINT "addons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_addons" ADD CONSTRAINT "connection_addons_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_addons" ADD CONSTRAINT "connection_addons_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "network_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_addons" ADD CONSTRAINT "connection_addons_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "addons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "network_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_timelines" ADD CONSTRAINT "service_request_timelines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_timelines" ADD CONSTRAINT "service_request_timelines_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_settings" ADD CONSTRAINT "portal_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_policies" ADD CONSTRAINT "service_request_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_connections" ADD CONSTRAINT "network_connections_servicePlanId_fkey" FOREIGN KEY ("servicePlanId") REFERENCES "service_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

