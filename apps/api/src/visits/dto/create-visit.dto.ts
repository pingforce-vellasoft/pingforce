import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsIn,
  IsISO8601,
  IsLatitude,
  IsLongitude,
} from 'class-validator';

export const VISIT_TYPES = [
  'PLANNED',
  'AD_HOC',
  'EMERGENCY',
  'MAINTENANCE',
  'INSPECTION',
  'INSTALLATION',
  'COMPLAINT',
  'SALES',
  'SURVEY',
  'FOLLOW_UP',
] as const;

export const VISIT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export class CreateVisitDto {
  @IsString()
  @IsNotEmpty()
  readonly purpose!: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsIn(VISIT_TYPES)
  readonly visitType?: string;

  @IsOptional()
  @IsIn(VISIT_PRIORITIES)
  readonly priority?: string;

  @IsOptional()
  @IsUUID()
  readonly customerId?: string;

  @IsOptional()
  @IsUUID()
  readonly employeeId?: string;

  @IsOptional()
  @IsUUID()
  readonly geofenceId?: string;

  @IsOptional()
  @IsString()
  readonly siteAddress?: string;

  @IsOptional()
  @IsLatitude()
  readonly siteLatitude?: number;

  @IsOptional()
  @IsLongitude()
  readonly siteLongitude?: number;

  @IsISO8601()
  readonly plannedStartAt!: string;

  @IsOptional()
  @IsISO8601()
  readonly plannedEndAt?: string;

  @IsOptional()
  @IsISO8601()
  readonly slaDeadline?: string;
}
