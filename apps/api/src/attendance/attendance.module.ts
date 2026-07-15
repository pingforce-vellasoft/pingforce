import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { CorrectionsService } from './corrections.service';
import { OfflineSyncService } from './offline-sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AttendanceCommandHandlers } from './commands/handlers';
import { AttendanceEventHandlers } from './events/handlers';

@Module({
  imports: [PrismaModule, CqrsModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    CorrectionsService,
    OfflineSyncService,
    ...AttendanceCommandHandlers,
    ...AttendanceEventHandlers,
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
