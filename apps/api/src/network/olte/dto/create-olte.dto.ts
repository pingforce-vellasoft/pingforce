import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsIn,
  IsInt,
  Min,
  IsNumber,
  IsLatitude,
  IsLongitude,
} from 'class-validator';

export const OLTE_STATUSES = ['ACTIVE', 'MAINTENANCE', 'ARCHIVED'] as const;

export class CreateOlteDto {
  @IsString()
  @IsNotEmpty()
  readonly code!: string;

  @IsString()
  @IsNotEmpty()
  readonly name!: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsIn(OLTE_STATUSES)
  readonly status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly totalPorts?: number;

  @IsOptional()
  @IsString()
  readonly address?: string;

  @IsOptional()
  @IsString()
  readonly area?: string;

  @IsOptional()
  @IsString()
  readonly village?: string;

  @IsOptional()
  @IsString()
  readonly mandal?: string;

  @IsOptional()
  @IsString()
  readonly district?: string;

  @IsOptional()
  @IsNumber()
  @IsLatitude()
  readonly latitude?: number;

  @IsOptional()
  @IsNumber()
  @IsLongitude()
  readonly longitude?: number;
}
