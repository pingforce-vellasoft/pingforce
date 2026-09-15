import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
  Max,
  MinLength,
  IsIn,
} from 'class-validator';

// RegisterDeviceDto moved to devices/dto/device.dto.ts as BindDeviceDto, with
// the self-service registration endpoint it belonged to.

export class PunchDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  accuracy?: number;

  @IsOptional()
  @IsBoolean()
  isMockLocation?: boolean;

  @IsOptional()
  @IsBoolean()
  biometricVerified?: boolean;

  @IsString()
  deviceId!: string;
  @IsString()
  signature!: string;
  @IsDateString()
  timestamp!: string;
}

export class CreateGeofenceDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsNumber()
  @Min(10)
  @Max(10000)
  radiusMeters!: number;
}

export class UpdateAttendancePolicyDto {
  @IsBoolean()
  readonly gpsRequired!: boolean;

  @IsBoolean()
  readonly geofenceRequired!: boolean;

  @IsBoolean()
  readonly biometricRequired!: boolean;

  @IsNumber()
  @Min(1)
  @Max(10000)
  readonly gpsAccuracyThreshold!: number;

  @IsBoolean()
  readonly allowLowAccuracy!: boolean;

  @IsBoolean()
  readonly allowOfflineCheckIn!: boolean;

  @IsIn(['BLOCK', 'WARN', 'ALLOW'])
  readonly outsideGeofencePolicy!: 'BLOCK' | 'WARN' | 'ALLOW';

  @IsIn(['BLOCK', 'WARN'])
  readonly mockLocationPolicy!: 'BLOCK' | 'WARN';
}
