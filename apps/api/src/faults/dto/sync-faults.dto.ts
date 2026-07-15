import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsUUID,
  IsIn,
  IsISO8601,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { FaultPriority } from '@pingforce-monorepo/shared';

export const OFFLINE_FAULT_ACTIONS = ['CREATE', 'UPDATE_STATUS'] as const;

export const FAULT_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const;

export class OfflineFaultActionDto {
  /** Client-generated id used for idempotent replay. */
  @IsString()
  @IsNotEmpty()
  readonly clientRef!: string;

  @IsIn(OFFLINE_FAULT_ACTIONS)
  readonly action!: (typeof OFFLINE_FAULT_ACTIONS)[number];

  /** Original capture time on the device. */
  @IsISO8601()
  readonly timestamp!: string;

  // CREATE fields — faultNumber is the natural idempotency key
  @IsOptional()
  @IsString()
  readonly faultNumber?: string;

  @IsOptional()
  @IsString()
  readonly title?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsEnum(FaultPriority)
  readonly priority?: string;

  @IsOptional()
  @IsUUID()
  readonly customerId?: string;

  // UPDATE_STATUS fields
  @IsOptional()
  @IsUUID()
  readonly faultId?: string;

  @IsOptional()
  @IsIn(FAULT_STATUSES)
  readonly status?: string;

  @IsOptional()
  @IsString()
  readonly notes?: string;
}

export class SyncFaultsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OfflineFaultActionDto)
  readonly actions!: OfflineFaultActionDto[];
}
