import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Fields a Super Admin may edit on a tenant (admin portal tenant details and
 * enable/disable toggle). The route used to pass the raw body to Prisma, so
 * any column — code, tokens, billing mirrors — could be overwritten; with the
 * global whitelist pipe anything not listed here is now a 400.
 */
export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly name?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'PROVISIONING'])
  readonly status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly legalName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly industry?: string | null;

  // Not IsEmail: existing rows may hold '' and the edit form sends it back.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly contactEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly contactPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  readonly timezone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  readonly country?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly subscriptionPlan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly subscriptionStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  readonly currency?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  readonly taxId?: string | null;

  @IsOptional()
  @Matches(/^(#[0-9a-fA-F]{6})?$/, { message: 'themeColor must be #RRGGBB' })
  readonly themeColor?: string | null;

  @IsOptional()
  @IsBoolean()
  readonly isAttendanceEnabled?: boolean;
}
