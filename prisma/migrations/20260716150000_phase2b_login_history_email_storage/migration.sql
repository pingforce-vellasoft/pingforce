-- Phase 2b: login history (LoginHistory.md), per-tenant email provider
-- (Email.md §5), real file storage metadata (Upload.md §8/§11)

-- Login history: immutable authentication-activity trail
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "authMethod" TEXT NOT NULL DEFAULT 'PASSWORD',
    "outcome" TEXT NOT NULL,
    "sessionId" TEXT,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_history_tenantId_createdAt_idx" ON "login_history"("tenantId", "createdAt");
CREATE INDEX "login_history_tenantId_userId_createdAt_idx" ON "login_history"("tenantId", "userId", "createdAt");
CREATE INDEX "login_history_tenantId_outcome_idx" ON "login_history"("tenantId", "outcome");
CREATE INDEX "login_history_sessionId_idx" ON "login_history"("sessionId");

ALTER TABLE "login_history" ADD CONSTRAINT "login_history_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-tenant SMTP provider configuration
CREATE TABLE "tenant_email_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "passwordEnc" TEXT,
    "fromAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "tenant_email_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_email_configs_tenantId_key" ON "tenant_email_configs"("tenantId");

ALTER TABLE "tenant_email_configs" ADD CONSTRAINT "tenant_email_configs_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- File storage: checksum + provider on attachment metadata
ALTER TABLE "file_attachments" ADD COLUMN "checksum" TEXT;
ALTER TABLE "file_attachments" ADD COLUMN "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL';
CREATE INDEX "file_attachments_tenantId_checksum_idx" ON "file_attachments"("tenantId", "checksum");
