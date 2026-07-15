import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../prisma/prisma.module';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { VisitsSyncService } from './visits-sync.service';

@Module({
  imports: [PrismaModule, CqrsModule],
  controllers: [VisitsController],
  providers: [VisitsService, VisitsSyncService],
  exports: [VisitsService],
})
export class VisitsModule {}
