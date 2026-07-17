import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsIn,
  IsUUID,
  IsNumber,
  Min,
  IsLatitude,
  IsLongitude,
  IsDateString,
} from 'class-validator';

export const CONNECTION_NODE_TYPES = [
  'CUSTOMER',
  'JUNCTION',
  'SPLITTER',
] as const;

export const CONNECTION_STATUSES = [
  'ACTIVE',
  'PENDING_INSTALLATION',
  'SUSPENDED',
  'DISCONNECTED',
  'FAULTY',
  'MAINTENANCE',
] as const;

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  readonly connectionCode!: string;

  @IsUUID()
  readonly olteId!: string;

  @IsOptional()
  @IsUUID()
  readonly customerId?: string;

  /** Omit to attach the connection directly to the OLTE (root level). */
  @IsOptional()
  @IsUUID()
  readonly parentConnectionId?: string;

  @IsOptional()
  @IsIn(CONNECTION_NODE_TYPES)
  readonly nodeType?: string;

  @IsOptional()
  @IsIn(CONNECTION_STATUSES)
  readonly status?: string;

  @IsOptional()
  @IsString()
  readonly connectionType?: string;

  @IsOptional()
  @IsString()
  readonly cableType?: string;

  @IsOptional()
  @IsString()
  readonly fiberCoreDetails?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly distanceMeters?: number;

  @IsOptional()
  @IsDateString()
  readonly installationDate?: string;

  @IsOptional()
  @IsUUID()
  readonly assignedEmployeeId?: string;

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  readonly latitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  readonly longitude?: number;

  @IsOptional()
  @IsString()
  readonly remarks?: string;
}
