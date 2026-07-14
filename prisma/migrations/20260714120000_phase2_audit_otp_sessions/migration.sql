-- Phase 2: audit logging, OTP hardening, session persistence, refresh-token rotation metadata

-- Sessions: activity tracking + revocation
ALTER TABLE "sessions" ADD COLUMN "platform" TEXT;
ALTER TABLE "sessions" ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sessions" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN "revokeReason" TEXT;
ALTER TABLE "sessions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- Refresh tokens: session binding + rotation/replay metadata
ALTER TABLE "refresh_tokens" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "revokeReason" TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN "lastUsedAt" TIMESTAMP(3);

CREATE INDEX "refresh_tokens_sessionId_idx" ON "refresh_tokens"("sessionId");

-- OTP codes: tenant scoping, hashed storage metadata, retry policy
ALTER TABLE "otp_codes" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "otp_codes" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "otp_codes" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "otp_codes_userId_purpose_idx" ON "otp_codes"("userId", "purpose");
CREATE INDEX "otp_codes_tenantId_idx" ON "otp_codes"("tenantId");

-- Audit logs: full spec record structure (AuditLogs.md section 5)
ALTER TABLE "audit_logs" ADD COLUMN "module" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "outcome" TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "audit_logs" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'INFO';
ALTER TABLE "audit_logs" ADD COLUMN "requestId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "userAgent" TEXT;

CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");
CREATE INDEX "audit_logs_tenantId_module_idx" ON "audit_logs"("tenantId", "module");
CREATE INDEX "audit_logs_tenantId_severity_idx" ON "audit_logs"("tenantId", "severity");
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");
