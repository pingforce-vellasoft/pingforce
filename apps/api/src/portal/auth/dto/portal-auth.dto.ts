import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class VerifyInviteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly token!: string;
}

export class ActivateInviteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly token!: string;

  /** OTP sent to the invited email/phone during verify step. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  readonly otp!: string;

  /** Optional — omitted means OTP-only login for this user. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly password?: string;
}

export class PortalLoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly tenantCode!: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{6,20}$/)
  readonly phone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  readonly password!: string;
}

export class PortalOtpRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly tenantCode!: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{6,20}$/)
  readonly phone?: string;
}

export class PortalOtpLoginDto extends PortalOtpRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  readonly otp!: string;
}

export class PortalRefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly refreshToken!: string;
}

export class PortalUpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly lastName?: string;
}

export class InviteContactDto {
  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-\s()]{6,20}$/)
  readonly phone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly lastName?: string;

  @IsOptional()
  @IsIn(['OWNER', 'MEMBER', 'VIEWER'])
  readonly portalRole?: string;
}

export class UpdatePortalUserDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  readonly status?: string;

  @IsOptional()
  @IsIn(['OWNER', 'MEMBER', 'VIEWER'])
  readonly portalRole?: string;
}
