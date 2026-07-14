import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { IsStrongPassword } from '../../common/validators/password-policy.decorator';

export class ConfirmPasswordResetDto {
  @IsNotEmpty()
  @IsEmail()
  readonly email!: string;

  @IsNotEmpty()
  @IsString()
  readonly tenantCode!: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'otp must be a 6-digit code' })
  readonly otp!: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword()
  readonly newPassword!: string;
}
