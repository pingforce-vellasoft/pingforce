-- 3.8 Customer Portal — end-user identity & self-service foundation
-- (docs/project_specifications/Milestone-3-Business-Modules/3.8_CustomerPortal)

-- Tenant-level module gating + portal policy defaults (Super Admin / Tenant Admin controlled)
ALTER TABLE "tenant_settings"
  ADD COLUMN "customerPortalEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "portalMaxContacts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "portalFaultReopenHours" INTEGER NOT NULL DEFAULT 72;

-- Portal-raised faults: channel + reporter + closure rating (BR-3)
ALTER TABLE "faults"
  ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'STAFF',
  ADD COLUMN "reportedByPortalUserId" TEXT,
  ADD COLUMN "customerRating" INTEGER,
  ADD COLUMN "customerRatingComment" TEXT;

-- Customer-visible timeline flag (BR-3.4) — existing rows stay internal-only
ALTER TABLE "fault_timelines"
  ADD COLUMN "isCustomerVisible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "customer_portal_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "portalRole" TEXT NOT NULL DEFAULT 'MEMBER',
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_portal_invites" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "portalRole" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "portalUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_portal_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_portal_otps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_portal_otps_pkey" PRIMARY KEY ("id")
);

-- Refresh tokens for the portal identity type
ALTER TABLE "refresh_tokens"
  ADD COLUMN "portalUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customer_portal_users_tenantId_email_key" ON "customer_portal_users"("tenantId", "email");
CREATE UNIQUE INDEX "customer_portal_users_tenantId_phone_key" ON "customer_portal_users"("tenantId", "phone");
CREATE UNIQUE INDEX "customer_portal_users_id_tenantId_key" ON "customer_portal_users"("id", "tenantId");
CREATE INDEX "customer_portal_users_tenantId_customerId_idx" ON "customer_portal_users"("tenantId", "customerId");
CREATE INDEX "customer_portal_users_tenantId_status_idx" ON "customer_portal_users"("tenantId", "status");

CREATE UNIQUE INDEX "customer_portal_invites_tokenHash_key" ON "customer_portal_invites"("tokenHash");
CREATE UNIQUE INDEX "customer_portal_invites_id_tenantId_key" ON "customer_portal_invites"("id", "tenantId");
CREATE INDEX "customer_portal_invites_tenantId_customerId_idx" ON "customer_portal_invites"("tenantId", "customerId");
CREATE INDEX "customer_portal_invites_tenantId_status_idx" ON "customer_portal_invites"("tenantId", "status");

CREATE INDEX "customer_portal_otps_portalUserId_purpose_idx" ON "customer_portal_otps"("portalUserId", "purpose");
CREATE INDEX "customer_portal_otps_tenantId_idx" ON "customer_portal_otps"("tenantId");

CREATE INDEX "refresh_tokens_portalUserId_idx" ON "refresh_tokens"("portalUserId");

-- AddForeignKey
ALTER TABLE "customer_portal_users" ADD CONSTRAINT "customer_portal_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_portal_users" ADD CONSTRAINT "customer_portal_users_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_portal_invites" ADD CONSTRAINT "customer_portal_invites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_portal_invites" ADD CONSTRAINT "customer_portal_invites_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_portal_invites" ADD CONSTRAINT "customer_portal_invites_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "customer_portal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_portal_otps" ADD CONSTRAINT "customer_portal_otps_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "customer_portal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "customer_portal_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
