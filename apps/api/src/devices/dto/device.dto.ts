import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Why an employee wants their binding moved to a different handset. */
export enum DeviceChangeReason {
  LOST = 'LOST',
  STOLEN = 'STOLEN',
  DAMAGED = 'DAMAGED',
  UPGRADED = 'UPGRADED',
  OTHER = 'OTHER',
}

export enum DeviceChangeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

/**
 * Handset fingerprint (DeviceManagement.md §6). Optional throughout — an
 * approver benefits from "Galaxy A54 / Android 14", but a client that cannot
 * read a field must still be able to bind. No hardware serial is collected.
 */
export class DeviceMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly osVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  readonly model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  readonly manufacturer?: string;
}

/** One-time binding performed at the end of onboarding. */
export class BindDeviceDto extends DeviceMetadataDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly deviceId!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  readonly publicKey!: string;
}

/** Employee-raised request to move the binding. Admin/HR clears it. */
export class CreateDeviceChangeRequestDto extends DeviceMetadataDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly newDeviceId!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  readonly publicKey!: string;

  @IsEnum(DeviceChangeReason)
  readonly reason!: DeviceChangeReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly notes?: string;
}

/**
 * Activates a binding an admin approved. The key is supplied by the handset
 * itself, never by the approver.
 */
export class ClaimDeviceDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly deviceId!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  readonly publicKey!: string;
}

export class RejectDeviceChangeRequestDto {
  /** Mandatory — the employee is told why, and the queue stays auditable. */
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  readonly rejectionReason!: string;
}

export class RevokeDeviceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly reason?: string;
}

export class ListDeviceChangeRequestsDto {
  @IsOptional()
  @IsEnum(DeviceChangeStatus)
  readonly status?: DeviceChangeStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  readonly take?: number;
}

export class ListDevicesDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  readonly take?: number;
}
