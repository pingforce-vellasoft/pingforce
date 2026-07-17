import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export const SERVICE_REQUEST_TYPES = [
  'PLAN_CHANGE',
  'ADDON_ADD',
  'ADDON_REMOVE',
  'RELOCATION',
  'SUSPENSION',
  'RESUMPTION',
  'TERMINATION',
  'SPEED_UPGRADE',
  'OTHER',
] as const;

// Staff-driven transitions the queue exposes (submit/auto handled server-side).
export const STAFF_SR_STATUSES = [
  'UNDER_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
] as const;

export class PortalCreateServiceRequestDto {
  @IsIn(SERVICE_REQUEST_TYPES)
  readonly type!: string;

  @IsOptional()
  @IsUUID()
  readonly connectionId?: string;

  // Type-specific detail: { targetPlanId }, { addOnId }, { newAddress }, etc.
  // Validated per-type in the service against the tenant catalog.
  @IsObject()
  readonly payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  readonly note?: string;
}

export class PortalListServiceRequestQueryDto {
  @IsOptional()
  @IsString()
  readonly status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly take?: number;
}

export class StaffTransitionServiceRequestDto {
  @IsIn(STAFF_SR_STATUSES)
  readonly toStatus!: string;

  @IsOptional()
  @IsString()
  readonly note?: string;

  @IsOptional()
  @IsUUID()
  readonly assignedToId?: string;

  @IsOptional()
  @Type(() => Date)
  readonly scheduledAt?: Date;
}
