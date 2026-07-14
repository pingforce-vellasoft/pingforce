import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/password-policy.decorator';

export class RegisterEmployeeDto {
  @IsString()
  @IsNotEmpty()
  tenantCode!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
