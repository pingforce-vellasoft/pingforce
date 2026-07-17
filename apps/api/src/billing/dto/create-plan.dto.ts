import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MaxLength(50)
  readonly code!: string;

  @IsString()
  @MaxLength(120)
  readonly name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly tagline?: string;

  /** Amount in smallest currency unit (paise). 0 for custom/contact-sales. */
  @IsInt()
  @Min(0)
  readonly amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  readonly currency?: string;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  readonly interval?: 'MONTHLY' | 'YEARLY';

  @IsArray()
  @IsString({ each: true })
  readonly features!: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  readonly maxFieldStaff?: number;

  @IsOptional()
  @IsBoolean()
  readonly highlighted?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly isCustom?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly isActive?: boolean;

  @IsOptional()
  @IsInt()
  readonly sortOrder?: number;
}
