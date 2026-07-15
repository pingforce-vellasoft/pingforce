import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Correction types (ATTENDANCE_CORRECTION.md §4) */
export const CORRECTION_TYPES = [
  'MISSING_CHECK_IN',
  'MISSING_CHECK_OUT',
  'WRONG_CHECK_IN_TIME',
  'WRONG_CHECK_OUT_TIME',
  'WRONG_ATTENDANCE_STATUS',
  'GPS_EXCEPTION',
  'GEOFENCE_EXCEPTION',
  'DEVICE_FAILURE',
  'BIOMETRIC_FAILURE',
  'OFFLINE_SYNC_ISSUE',
  'BREAK_TIME_ADJUSTMENT',
  'MANUAL_ATTENDANCE_REQUEST',
] as const;
export type CorrectionType = (typeof CORRECTION_TYPES)[number];

export class CreateCorrectionDto {
  @IsNotEmpty()
  @IsString()
  readonly attendanceId!: string;

  @IsNotEmpty()
  @IsIn(CORRECTION_TYPES)
  readonly correctionType!: CorrectionType;

  /** For time corrections: ISO-8601 datetime. For status: the new status. */
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  readonly requestedValue!: string;

  // Supporting reason is mandatory (ATTENDANCE_CORRECTION.md §9)
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  readonly reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly currentValue?: string;
}
