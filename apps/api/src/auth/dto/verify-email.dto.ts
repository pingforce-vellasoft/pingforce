import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * Confirms a self-signup admin's email and activates their workspace.
 * The tenant is identified by its workspace code (returned from register-tenant).
 */
export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  tenantCode!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}
