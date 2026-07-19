import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * One background location fix captured by a field operator's device
 * (TRACKING — background field-operator tracking). Batched and uploaded
 * through the mobile offline sync queue, so it carries a client-generated
 * idempotency key like the offline punch pipeline (sync-punches.dto.ts).
 */
export class LocationPingDto {
  /** Client-generated id used to dedupe retried uploads. */
  @IsNotEmpty()
  @IsString()
  readonly clientRef!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  readonly latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  readonly longitude!: number;

  @IsOptional()
  @IsNumber()
  readonly accuracy?: number;

  @IsOptional()
  @IsNumber()
  readonly speed?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  readonly batteryLevel?: number;

  @IsOptional()
  @IsString()
  readonly provider?: string;

  /** Original capture time (not upload time). */
  @IsNotEmpty()
  @IsDateString()
  readonly capturedAt!: string;
}

export class PingBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => LocationPingDto)
  readonly pings!: LocationPingDto[];
}
