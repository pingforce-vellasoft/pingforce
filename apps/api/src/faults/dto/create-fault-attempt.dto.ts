import {
  IsIn,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** 3.3 ATTEMPT_MANAGEMENT.md §4. */
export const FAULT_ATTEMPT_TYPES = [
  'INITIAL_VISIT',
  'FOLLOW_UP_VISIT',
  'REMOTE_TROUBLESHOOTING',
  'PREVENTIVE_MAINTENANCE',
  'INSPECTION',
  'VERIFICATION_VISIT',
  'VENDOR_VISIT',
  'CUSTOMER_ASSISTANCE',
  'EMERGENCY_VISIT',
  'FINAL_RESOLUTION_VISIT',
] as const;

/** 3.3 ATTEMPT_MANAGEMENT.md §6. */
export const FAULT_ATTEMPT_OUTCOMES = [
  'RESOLVED',
  'PARTIALLY_RESOLVED',
  'CUSTOMER_NOT_AVAILABLE',
  'WAITING_FOR_PARTS',
  'VENDOR_REQUIRED',
  'ESCALATED',
  'REVISIT_REQUIRED',
  'DUPLICATE_FAULT',
  'INVALID_COMPLAINT',
  'CANCELLED',
] as const;

export type FaultAttemptType = (typeof FAULT_ATTEMPT_TYPES)[number];
export type FaultAttemptOutcome = (typeof FAULT_ATTEMPT_OUTCOMES)[number];

export class CreateFaultAttemptDto {
  @IsIn(FAULT_ATTEMPT_TYPES)
  readonly attemptType!: FaultAttemptType;

  @IsIn(FAULT_ATTEMPT_OUTCOMES)
  readonly outcome!: FaultAttemptOutcome;

  @IsISO8601()
  readonly startedAt!: string;

  @IsOptional()
  @IsISO8601()
  readonly endedAt?: string;

  @IsOptional()
  @IsLatitude()
  readonly latitude?: number;

  @IsOptional()
  @IsLongitude()
  readonly longitude?: number;

  /** Required when the outcome is RESOLVED (§7 "resolution attempts require notes"). */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  readonly workNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly nextAction?: string;

  /** Device-generated key; a retried submit returns the first attempt. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  readonly clientRef?: string;
}
