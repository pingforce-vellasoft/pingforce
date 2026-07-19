import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingRetentionProcessor } from './tracking-retention.processor';

// RbacService is provided globally by the @Global RbacModule, so it needs no
// import here (mirrors AttendanceModule, which injects it the same way).
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'tracking-retention' }),
  ],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingRetentionProcessor],
  exports: [TrackingService],
})
export class TrackingModule {}
