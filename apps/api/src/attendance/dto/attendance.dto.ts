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
} from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  deviceId!: string;
  @IsString()
  publicKey!: string;
}

export class PunchDto {
  @IsNumber()
  latitude!: number;
  @IsNumber()
  longitude!: number;
  @IsOptional()
  @IsNumber()
  accuracy?: number;
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
