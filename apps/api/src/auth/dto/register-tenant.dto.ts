import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/password-policy.decorator';

export class RegisterTenantDto {
  /**
   * Subscription started on the website (paid checkout or free trial). When
   * present, the new tenant is linked to it. Required unless SELF_SIGNUP_OPEN
   * is enabled — signup is normally gated behind a chosen plan.
   */
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsString()
  @IsOptional()
  tenantName?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsEmail()
  @IsNotEmpty()
  adminEmail!: string;

  @IsString()
  @IsStrongPassword()
  adminPassword!: string;

  @IsString()
  @IsOptional()
  adminFirstName?: string;

  @IsString()
  @IsOptional()
  adminLastName?: string;

  @IsString()
  @IsOptional()
  adminPhone?: string;
}
