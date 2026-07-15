import { Global, Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';

// Global: the approval engine is consumed by leave, claims, attendance
// corrections and future workflow modules (ApprovalWorkflow.md §3).
@Global()
@Module({
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
