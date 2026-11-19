import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePipelineStageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  readonly name!: string;
}

export class RenamePipelineStageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  readonly name!: string;
}

/** Every stage of the tenant, in the new board order. */
export class ReorderPipelineStagesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  readonly stageIds!: string[];
}
