-- C3: complete data-scope levels (DataScope.md §4/§12)
-- Region + BusinessUnit org masters, employee assignments, and
-- user_scope_overrides for CUSTOM (rule-driven) scope.

-- Region master
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "regions_tenantId_code_key" ON "regions"("tenantId", "code");
CREATE UNIQUE INDEX "regions_id_tenantId_key" ON "regions"("id", "tenantId");

ALTER TABLE "regions" ADD CONSTRAINT "regions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Business unit master
CREATE TABLE "business_units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_units_tenantId_code_key" ON "business_units"("tenantId", "code");
CREATE UNIQUE INDEX "business_units_id_tenantId_key" ON "business_units"("id", "tenantId");

ALTER TABLE "business_units" ADD CONSTRAINT "business_units_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Employee org assignments for REGION / BUSINESS_UNIT scope predicates
ALTER TABLE "employees" ADD COLUMN "regionId" TEXT;
ALTER TABLE "employees" ADD COLUMN "businessUnitId" TEXT;

CREATE INDEX "employees_tenantId_regionId_idx" ON "employees"("tenantId", "regionId");
CREATE INDEX "employees_tenantId_businessUnitId_idx" ON "employees"("tenantId", "businessUnitId");

ALTER TABLE "employees" ADD CONSTRAINT "employees_regionId_fkey"
    FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_businessUnitId_fkey"
    FOREIGN KEY ("businessUnitId") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CUSTOM scope rules (DataScope.md §12 — user_scope_overrides)
CREATE TABLE "user_scope_overrides" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" TEXT,
    "scopeType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "user_scope_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_scope_overrides_id_tenantId_key" ON "user_scope_overrides"("id", "tenantId");
CREATE INDEX "user_scope_overrides_tenantId_userId_idx" ON "user_scope_overrides"("tenantId", "userId");

ALTER TABLE "user_scope_overrides" ADD CONSTRAINT "user_scope_overrides_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_scope_overrides" ADD CONSTRAINT "user_scope_overrides_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
