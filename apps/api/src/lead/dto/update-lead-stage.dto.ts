import { IsString } from 'class-validator';

export class UpdateLeadStageDto {
  @IsString()
  pipelineStageId!: string;
}
