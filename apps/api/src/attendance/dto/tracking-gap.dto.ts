import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const TRACKING_GAP_REASONS = [
  'LOCATION_DISABLED',
  'PERMISSION_DENIED',
  'SERVICE_STOPPED',
  'FIX_TIMEOUT',
] as const;

export class OpenTrackingGapDto {
  @IsNotEmpty()
  @IsIn(TRACKING_GAP_REASONS)
  readonly reason!: (typeof TRACKING_GAP_REASONS)[number];

  @IsOptional()
  @IsString()
  readonly attendanceSessionId?: string;

  @IsOptional()
  @IsISO8601()
  readonly startedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  readonly batteryLevel?: number;

  @IsOptional()
  @IsString()
  readonly deviceId?: string;
}

export const EXEMPTION_REASONS = [
  'LOW_BATTERY_HARDWARE',
  'OEM_BACKGROUND_RESTRICTION',
  'OTHER',
] as const;

export class RequestExemptionDto {
  @IsNotEmpty()
  @IsString()
  readonly employeeId!: string;

  @IsNotEmpty()
  @IsString()
  readonly deviceId!: string;

  @IsNotEmpty()
  @IsIn(EXEMPTION_REASONS)
  readonly reason!: (typeof EXEMPTION_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly notes?: string;
}

export class ReviewExemptionDto {
  @IsNotEmpty()
  @IsIn(['APPROVED', 'REJECTED', 'REVOKED'])
  readonly status!: 'APPROVED' | 'REJECTED' | 'REVOKED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly reviewNotes?: string;

  /** Approvals should expire so the hardware is re-justified periodically. */
  @IsOptional()
  @IsISO8601()
  readonly expiresAt?: string;
}
