import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bull';
import { FaultsController } from './faults.controller';
import { SlaPolicyService } from './sla-policy.service';
import { SlaPolicyController } from './sla-policy.controller';
import { SlaComputationService } from '@pingforce-monorepo/shared';
import { FaultsRepository } from './faults.repository';
import { CommandHandlers } from './commands/handlers';
import { QueryHandlers } from './queries/handlers';
import { SlaMonitorProcessor } from './sla-monitor.processor';
import { FaultsSyncService } from './faults-sync.service';

@Module({
  imports: [CqrsModule, BullModule.registerQueue({ name: 'sla-monitor' })],
  controllers: [FaultsController, SlaPolicyController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    SlaPolicyService,
    SlaComputationService,
    FaultsRepository,
    SlaMonitorProcessor,
    FaultsSyncService,
  ],
  exports: [SlaPolicyService, FaultsRepository],
})
export class FaultsModule {}
