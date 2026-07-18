import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/password-policy.decorator';

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  readonly currentPassword!: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword()
  readonly newPassword!: string;
}
