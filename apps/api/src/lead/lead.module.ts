import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';
import { LeadRepository } from './lead.repository';
import { PipelineStageService } from './pipeline-stage.service';

@Module({
  imports: [CqrsModule],
  controllers: [LeadController],
  providers: [LeadService, LeadRepository, PipelineStageService],
})
export class LeadModule {}
