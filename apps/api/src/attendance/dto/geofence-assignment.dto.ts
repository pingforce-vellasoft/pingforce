import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Assign one or more employees to a geofence.
 *
 * Idempotent by design: employee ids already assigned to this geofence are
 * skipped rather than rejected, so a double-submit from the admin UI cannot
 * fail the whole batch.
 */
export class AssignEmployeesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  // Bounded so a malformed or hostile client cannot push an unbounded id list
  // through the validation pipe and into a single transaction.
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  readonly employeeIds!: string[];

  /**
   * Only meaningful when the tenant has `allowMultipleGeofencesPerEmployee`
   * off. False (default) makes an employee who already belongs to a different
   * geofence a conflict — the service returns 409 naming the geofence so the
   * admin makes the call. True moves them: existing assignments are released
   * and replaced with this one.
   */
  @IsOptional()
  @IsBoolean()
  readonly reassign?: boolean;
}

export class UnassignEmployeesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  readonly employeeIds!: string[];
}

/** Query for the employee picker on the geofence roster screen. */
export class AssignableEmployeesQueryDto {
  /** Free-text match on name or employee code. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  readonly search?: string;

  /**
   * ASSIGNABLE (default) hides employees the single-geofence rule would reject
   * anyway; ALL returns everyone with their current geofence attached so the
   * admin can deliberately reassign. Ignored when the tenant allows multiple
   * geofences per employee, where everyone is assignable.
   */
  @IsOptional()
  @IsIn(['ASSIGNABLE', 'ALL'])
  readonly scope?: 'ASSIGNABLE' | 'ALL';

  @IsOptional()
  @Type(() => Number)
  readonly page?: number;

  @IsOptional()
  @Type(() => Number)
  readonly pageSize?: number;
}

/** Tenant-level toggle for how many geofences one employee may hold. */
export class UpdateGeofencePolicyDto {
  @IsBoolean()
  readonly allowMultipleGeofencesPerEmployee!: boolean;
}
