-- C4: multi-stage workflow engine (2.11_WorkflowEngine/ApprovalWorkflow.md)
-- C5 rides on C4 (attendance_corrections gains no columns — review tiers are
--    driven by workflowStatus values + workflow_instances)
-- C6: audit hash-chain, retention/archive and export history (AuditLogs.md)

-- ── C4: workflow definitions ─────────────────────────────────────────────────

CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_definitions_tenantId_code_key" ON "workflow_definitions"("tenantId", "code");
CREATE UNIQUE INDEX "workflow_definitions_id_tenantId_key" ON "workflow_definitions"("id", "tenantId");
CREATE INDEX "workflow_definitions_tenantId_module_entityName_active_idx" ON "workflow_definitions"("tenantId", "module", "entityName", "active");

ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "workflow_stages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "stageName" TEXT NOT NULL,
    "approvalMode" TEXT NOT NULL DEFAULT 'SEQUENTIAL',
    "minimumApprovals" INTEGER NOT NULL DEFAULT 1,
    "requiredAction" TEXT NOT NULL DEFAULT 'APPROVE',
    "approverRoleId" TEXT,
    "approverUserId" TEXT,
    "slaHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_stages_workflowId_stageNumber_key" ON "workflow_stages"("workflowId", "stageNumber");
CREATE INDEX "workflow_stages_tenantId_idx" ON "workflow_stages"("tenantId");

ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ownerEmployeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStage" INTEGER NOT NULL DEFAULT 1,
    "context" JSONB,
    "slaDueAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_instances_id_tenantId_key" ON "workflow_instances"("id", "tenantId");
CREATE INDEX "workflow_instances_tenantId_entityName_entityId_idx" ON "workflow_instances"("tenantId", "entityName", "entityId");
CREATE INDEX "workflow_instances_tenantId_status_slaDueAt_idx" ON "workflow_instances"("tenantId", "status", "slaDueAt");

ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "workflow_actions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "notes" TEXT,
    "actedAsDelegateOf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_actions_instanceId_stageNumber_idx" ON "workflow_actions"("instanceId", "stageNumber");
CREATE INDEX "workflow_actions_tenantId_idx" ON "workflow_actions"("tenantId");

ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_actions" ADD CONSTRAINT "workflow_actions_instanceId_fkey"
    FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "workflow_delegations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "delegatorUserId" TEXT NOT NULL,
    "delegateUserId" TEXT NOT NULL,
    "module" TEXT,
    "reason" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "workflow_delegations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_delegations_id_tenantId_key" ON "workflow_delegations"("id", "tenantId");
CREATE INDEX "workflow_delegations_tenantId_delegateUserId_idx" ON "workflow_delegations"("tenantId", "delegateUserId");
CREATE INDEX "workflow_delegations_tenantId_delegatorUserId_idx" ON "workflow_delegations"("tenantId", "delegatorUserId");

ALTER TABLE "workflow_delegations" ADD CONSTRAINT "workflow_delegations_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── C6: audit hash-chain columns ─────────────────────────────────────────────

ALTER TABLE "audit_logs" ADD COLUMN "sequence" BIGINT;
ALTER TABLE "audit_logs" ADD COLUMN "prevHash" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "chainHash" TEXT;

CREATE UNIQUE INDEX "audit_logs_tenantId_sequence_key" ON "audit_logs"("tenantId", "sequence");

CREATE TABLE "audit_chain_heads" (
    "tenantId" TEXT NOT NULL,
    "lastSequence" BIGINT NOT NULL DEFAULT 0,
    "lastHash" TEXT NOT NULL DEFAULT 'GENESIS',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_chain_heads_pkey" PRIMARY KEY ("tenantId")
);

ALTER TABLE "audit_chain_heads" ADD CONSTRAINT "audit_chain_heads_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "audit_retention_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "archiveAfterDays" INTEGER NOT NULL DEFAULT 180,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_retention_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audit_retention_policies_tenantId_key" ON "audit_retention_policies"("tenantId");

ALTER TABLE "audit_retention_policies" ADD CONSTRAINT "audit_retention_policies_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "audit_archive" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "module" TEXT,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "oldValue" JSONB,
    "newValue" JSONB,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "sequence" BIGINT,
    "prevHash" TEXT,
    "chainHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_archive_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_archive_tenantId_createdAt_idx" ON "audit_archive"("tenantId", "createdAt");
CREATE INDEX "audit_archive_tenantId_module_idx" ON "audit_archive"("tenantId", "module");

ALTER TABLE "audit_archive" ADD CONSTRAINT "audit_archive_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "audit_exports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedBy" TEXT,
    "filters" JSONB,
    "format" TEXT NOT NULL DEFAULT 'CSV',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_exports_tenantId_createdAt_idx" ON "audit_exports"("tenantId", "createdAt");

ALTER TABLE "audit_exports" ADD CONSTRAINT "audit_exports_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
