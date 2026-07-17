import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const BILLING_CYCLES = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;

export class CreateServicePlanDto {
  @IsString()
  @IsNotEmpty()
  readonly name!: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsString()
  readonly speedSpec?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly price!: number;

  @IsOptional()
  @IsString()
  readonly currency?: string;

  @IsOptional()
  @IsIn(BILLING_CYCLES)
  readonly billingCycle?: string;

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}

export class UpdateServicePlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsString()
  readonly speedSpec?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly price?: number;

  @IsOptional()
  @IsString()
  readonly currency?: string;

  @IsOptional()
  @IsIn(BILLING_CYCLES)
  readonly billingCycle?: string;

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;
}
