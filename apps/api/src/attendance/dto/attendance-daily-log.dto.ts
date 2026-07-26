import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query for the day-grouped attendance log (GET /attendance/daily-logs).
 *
 * One row per employee-day, not per session — a day with a lunch-time
 * check-out and a return is a single row with two sessions, which is how both
 * the employee and the tenant expect to read it.
 */
export class AttendanceDailyLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit: number = 30;

  /** Inclusive ISO date (YYYY-MM-DD). Defaults to 30 days back. */
  @IsOptional()
  @IsString()
  readonly from?: string;

  /** Inclusive ISO date (YYYY-MM-DD). Defaults to today. */
  @IsOptional()
  @IsString()
  readonly to?: string;

  /** Tenant view only — narrow to one employee. */
  @IsOptional()
  @IsString()
  readonly employeeId?: string;

  /** Tenant view only — free-text match on employee name/code. */
  @IsOptional()
  @IsString()
  readonly search?: string;

  @IsOptional()
  @IsIn(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'])
  readonly status?: string;

  /** Tenant view only — show only days needing attention. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  readonly exceptionsOnly?: boolean;
}
