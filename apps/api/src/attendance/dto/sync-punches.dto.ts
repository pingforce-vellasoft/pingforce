import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

/** One offline-captured punch (3.1 OFFLINE_SYNC.md §7 queue item). */
export class OfflinePunchItemDto {
  /** Client-generated id used to correlate results and dedupe retries */
  @IsNotEmpty()
  @IsString()
  readonly clientRef!: string;

  @IsNotEmpty()
  @IsString()
  readonly deviceId!: string;

  @IsNumber()
  readonly latitude!: number;

  @IsNumber()
  readonly longitude!: number;

  @IsNotEmpty()
  @IsString()
  readonly signature!: string;

  /** Original capture time (not upload time) */
  @IsNotEmpty()
  @IsDateString()
  readonly timestamp!: string;
}

export class SyncPunchesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OfflinePunchItemDto)
  readonly punches!: OfflinePunchItemDto[];
}
