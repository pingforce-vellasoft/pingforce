import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AttendanceSchedulerService } from './attendance-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AttendanceSchedulerService],
})
export class SchedulerModule {}
