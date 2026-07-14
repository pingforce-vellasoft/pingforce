import { IsIn, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

/** Purposes exposed on the standalone OTP endpoints (OTP.md §11). PASSWORD_RESET has its own dedicated flow. */
const SELF_SERVICE_PURPOSES = ['EMAIL_VERIFICATION'] as const;
export type SelfServiceOtpPurpose = (typeof SELF_SERVICE_PURPOSES)[number];

export class RequestOtpDto {
  @IsNotEmpty()
  @IsIn(SELF_SERVICE_PURPOSES)
  readonly purpose!: SelfServiceOtpPurpose;
}

export class VerifyOtpDto {
  @IsNotEmpty()
  @IsIn(SELF_SERVICE_PURPOSES)
  readonly purpose!: SelfServiceOtpPurpose;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit code' })
  readonly otp!: string;
}
