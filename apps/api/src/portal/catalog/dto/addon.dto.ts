import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const ADDON_BILLING_CYCLES = [
  'MONTHLY',
  'QUARTERLY',
  'ANNUAL',
  'ONE_TIME',
] as const;

export class CreateAddOnDto {
  @IsString()
  @IsNotEmpty()
  readonly name!: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly price!: number;

  @IsOptional()
  @IsString()
  readonly currency?: string;

  @IsOptional()
  @IsIn(ADDON_BILLING_CYCLES)
  readonly billingCycle?: string;

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}

export class UpdateAddOnDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly price?: number;

  @IsOptional()
  @IsString()
  readonly currency?: string;

  @IsOptional()
  @IsIn(ADDON_BILLING_CYCLES)
  readonly billingCycle?: string;

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
