import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { FaultsController } from './faults.controller';
import { SlaPolicyService } from './sla-policy.service';
import { SlaPolicyController } from './sla-policy.controller';
import { SlaComputationService } from '@pingforce-monorepo/shared';
import { FaultsRepository } from './faults.repository';
import { CommandHandlers } from './commands/handlers';
import { QueryHandlers } from './queries/handlers';

@Module({
  imports: [CqrsModule],
  controllers: [FaultsController, SlaPolicyController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    SlaPolicyService,
    SlaComputationService,
    FaultsRepository,
  ],
  exports: [SlaPolicyService, FaultsRepository],
})
export class FaultsModule {}
