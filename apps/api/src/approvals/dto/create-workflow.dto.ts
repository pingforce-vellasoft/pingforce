import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class WorkflowConditionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  readonly field!: string;

  @IsIn(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in'])
  readonly op!: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

  // Value type depends on op (number for gt/lt, array for in, ...)
  readonly value!: unknown;
}

export class WorkflowStageDto {
  @IsInt()
  @Min(1)
  readonly stageNumber!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly stageName!: string;

  @IsOptional()
  @IsIn(['SEQUENTIAL', 'PARALLEL'])
  readonly approvalMode?: 'SEQUENTIAL' | 'PARALLEL';

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly minimumApprovals?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z_]+$/)
  @MaxLength(40)
  readonly requiredAction?: string;

  @IsOptional()
  @IsUUID()
  readonly approverRoleId?: string;

  @IsOptional()
  @IsUUID()
  readonly approverUserId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly slaHours?: number;
}

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_-]+$/)
  @MaxLength(60)
  readonly code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  readonly name!: string;

  @IsString()
  @Matches(/^[A-Z_]+$/)
  @MaxLength(40)
  readonly module!: string;

  @IsString()
  @Matches(/^[a-z_]+$/)
  @MaxLength(60)
  readonly entityName!: string;

  @IsOptional()
  @IsBoolean()
  readonly active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  readonly conditions?: WorkflowConditionDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDto)
  readonly stages!: WorkflowStageDto[];
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  readonly name?: string;

  @IsOptional()
  @IsBoolean()
  readonly active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConditionDto)
  readonly conditions?: WorkflowConditionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDto)
  readonly stages?: WorkflowStageDto[];
}
