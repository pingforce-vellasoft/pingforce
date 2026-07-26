import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Adjusts the punch times on a single attendance session. */
export class AdjustSessionTimesDto {
  @IsNotEmpty()
  @IsString()
  readonly sessionId!: string;

  @IsOptional()
  @IsISO8601()
  readonly punchIn?: string;

  @IsOptional()
  @IsISO8601()
  readonly punchOut?: string;

  /** Required — every adjustment is auditable and must say why. */
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  readonly reason!: string;
}

export const OVERRIDABLE_STATUSES = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
  'ON_LEAVE',
] as const;

/** Sets the day-level attendance status irrespective of recorded punches. */
export class OverrideDayStatusDto {
  @IsNotEmpty()
  @IsString()
  readonly attendanceId!: string;

  @IsNotEmpty()
  @IsIn(OVERRIDABLE_STATUSES)
  readonly status!: (typeof OVERRIDABLE_STATUSES)[number];

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  readonly reason!: string;
}
