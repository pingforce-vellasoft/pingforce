import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsISO8601, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffUserGuard } from '../common/guards/staff-user.guard';
import { WorkflowEngineService } from '../approvals/workflow-engine.service';
import { SlaMonitorProcessor } from '../faults/sla-monitor.processor';
import { AttendanceSchedulerService } from '../scheduler/attendance-scheduler.service';

export class RunJobDto {
  /** Run the job as if the clock read this instant (default: now). */
  @IsOptional()
  @IsISO8601()
  readonly asOf?: string;
}

/** True only inside the disposable QA stack (deploy/qa/compose.yml). */
export const qaJobsEnabled = (): boolean => process.env.PINGFORCE_ENV === 'qa';

/**
 * QA-ONLY: runs the scheduled jobs (fault SLA scan, workflow SLA sweep,
 * midnight auto-checkout) on demand, "as of" a chosen time, so CI can test
 * timers without waiting hours. The module is only imported when
 * PINGFORCE_ENV=qa, and every call re-checks that, so it can never answer in
 * production. Tenant admins of the QA stack only.
 */
@Controller('qa/jobs')
@UseGuards(JwtAuthGuard, StaffUserGuard)
export class QaJobsController {
  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly slaMonitor: SlaMonitorProcessor,
    private readonly attendanceScheduler: AttendanceSchedulerService,
  ) {}

  @Post(':job')
  @HttpCode(200)
  async run(
    @Param('job') job: string,
    @Body() dto: RunJobDto,
    @Req() req: { user: { roleCode?: string } },
  ): Promise<{ job: string; asOf: string }> {
    if (!qaJobsEnabled()) throw new NotFoundException();
    if (req.user.roleCode !== 'ADMIN_MANAGER') {
      throw new ForbiddenException('QA job trigger is for tenant admins');
    }
    const asOf = dto.asOf ? new Date(dto.asOf) : new Date();
    switch (job) {
      case 'fault-sla':
        await this.slaMonitor.scanBreaches(asOf);
        break;
      case 'workflow-sla':
        await this.workflowEngine.escalateOverdue(asOf);
        break;
      case 'auto-checkout':
        await this.attendanceScheduler.autoCheckoutOpenSessions(asOf);
        break;
      default:
        throw new NotFoundException(`Unknown job ${job}`);
    }
    return { job, asOf: asOf.toISOString() };
  }
}
