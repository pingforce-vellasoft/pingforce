import { IsUUID } from 'class-validator';

export class UpdateLeadStageDto {
  @IsUUID()
  pipelineStageId!: string;
}
