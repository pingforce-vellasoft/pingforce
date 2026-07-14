import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/password-policy.decorator';

export class RegisterTenantDto {
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
