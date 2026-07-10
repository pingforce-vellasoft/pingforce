import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({ description: 'User email address' })
  @ValidateIf((o) => !o.phone)
  @IsNotEmpty({ message: 'email or phone must be provided' })
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User phone number' })
  @ValidateIf((o) => !o.email)
  @IsNotEmpty({ message: 'email or phone must be provided' })
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'User password' })
  @IsNotEmpty()
  @IsString()
  password!: string;

  @ApiPropertyOptional({
    description: 'Tenant code (required for non-super admins)',
  })
  @IsOptional()
  @IsString()
  tenantCode?: string;

  @ApiPropertyOptional({
    description: 'The platform attempting login',
    enum: ['ADMIN_PORTAL', 'MOBILE_APP'],
  })
  @IsOptional()
  @IsEnum(['ADMIN_PORTAL', 'MOBILE_APP'])
  portalType?: 'ADMIN_PORTAL' | 'MOBILE_APP';
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token' })
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'User email address' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Tenant code' })
  @IsNotEmpty()
  @IsString()
  tenantCode!: string;
}
