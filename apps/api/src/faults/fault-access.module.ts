import { Module } from '@nestjs/common';
import { FaultAccessService } from './fault-access.service';

@Module({
  providers: [FaultAccessService],
  exports: [FaultAccessService],
})
export class FaultAccessModule {}
