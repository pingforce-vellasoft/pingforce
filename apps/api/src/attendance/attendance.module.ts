import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { CorrectionsService } from './corrections.service';
import { OfflineSyncService } from './offline-sync.service';
import { GeofenceCacheService } from './geofence-cache.service';
import { AttendanceLogService } from './attendance-log.service';
import { AttendanceAdminService } from './attendance-admin.service';
import { TrackingGapService } from './tracking-gap.service';
import { GeofenceAssignmentService } from './geofence-assignment.service';
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
    GeofenceCacheService,
    AttendanceLogService,
    AttendanceAdminService,
    TrackingGapService,
    GeofenceAssignmentService,
    ...AttendanceCommandHandlers,
    ...AttendanceEventHandlers,
  ],
  exports: [AttendanceService, GeofenceCacheService, GeofenceAssignmentService],
})
export class AttendanceModule {}
