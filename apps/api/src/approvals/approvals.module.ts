import { Global, Module } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowSlaService } from './workflow-sla.service';

// Global: the approval engine is consumed by leave, claims, attendance
// corrections and future workflow modules (ApprovalWorkflow.md §3).
@Global()
@Module({
  controllers: [WorkflowsController],
  providers: [
    ApprovalsService,
    WorkflowEngineService,
    WorkflowsService,
    WorkflowSlaService,
  ],
  exports: [ApprovalsService, WorkflowEngineService],
})
export class ApprovalsModule {}
