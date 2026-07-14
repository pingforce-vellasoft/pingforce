import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateClaimDto {
  @IsNotEmpty()
  @IsString()
  readonly expenseCategoryId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  readonly amount!: number;

  @IsNotEmpty()
  @IsDateString()
  readonly date!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  readonly receiptUrl?: string;
}
