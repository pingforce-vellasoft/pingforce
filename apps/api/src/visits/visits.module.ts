import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { VisitsSyncService } from './visits-sync.service';

@Module({
  imports: [PrismaModule],
  controllers: [VisitsController],
  providers: [VisitsService, VisitsSyncService],
  exports: [VisitsService],
})
export class VisitsModule {}
