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
  IsLatitude,
  IsLongitude,
} from 'class-validator';

export const OFFLINE_VISIT_ACTIONS = [
  'ACCEPT',
  'START',
  'PAUSE',
  'RESUME',
  'COMPLETE',
] as const;

export class OfflineVisitActionDto {
  /** Client-generated id used for idempotent replay (3.2 OFFLINE_SYNC.md). */
  @IsString()
  @IsNotEmpty()
  readonly clientRef!: string;

  @IsUUID()
  readonly visitId!: string;

  @IsIn(OFFLINE_VISIT_ACTIONS)
  readonly action!: (typeof OFFLINE_VISIT_ACTIONS)[number];

  /** Original capture time on the device. */
  @IsISO8601()
  readonly timestamp!: string;

  @IsOptional()
  @IsLatitude()
  readonly latitude?: number;

  @IsOptional()
  @IsLongitude()
  readonly longitude?: number;

  @IsOptional()
  @IsString()
  readonly notes?: string;

  @IsOptional()
  @IsString()
  readonly outcome?: string;
}

export class SyncVisitsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OfflineVisitActionDto)
  readonly actions!: OfflineVisitActionDto[];
}
