import { Module } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { FaultsModule } from '../faults/faults.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { QaJobsController } from './qa-jobs.controller';

/** QA-only; imported by AppModule only when PINGFORCE_ENV=qa. */
@Module({
  imports: [ApprovalsModule, FaultsModule, SchedulerModule],
  controllers: [QaJobsController],
})
export class QaJobsModule {}
