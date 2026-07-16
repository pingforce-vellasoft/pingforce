import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WorkflowEngineService } from './workflow-engine.service';

/**
 * SLA monitor (ApprovalWorkflow.md §12): every 15 minutes, in-progress
 * instances past their stage SLA are flagged escalated and audited
 * (severity MEDIUM) so dashboards/alerting pick them up.
 */
@Injectable()
export class WorkflowSlaService {
  private readonly logger = new Logger(WorkflowSlaService.name);

  constructor(private readonly workflowEngine: WorkflowEngineService) {}

  @Cron('*/15 * * * *', { name: 'workflow-sla-sweep' })
  async sweep(): Promise<void> {
    try {
      await this.workflowEngine.escalateOverdue();
    } catch (error) {
      this.logger.error(
        'Workflow SLA sweep failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
