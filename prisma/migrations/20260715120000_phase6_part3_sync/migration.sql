-- Phase 6 part 3: offline-sync idempotency key on fault timeline entries

ALTER TABLE "fault_timelines" ADD COLUMN "clientRef" TEXT;
CREATE INDEX "fault_timelines_faultId_clientRef_idx" ON "fault_timelines"("faultId", "clientRef");
