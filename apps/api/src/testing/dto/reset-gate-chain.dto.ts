import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Which gates to re-arm. Every flag defaults to true, so the no-body call
 * rewinds the account to "fresh employee" and the whole chain replays.
 */
export class ResetGateChainDto {
  @ApiProperty({
    description:
      'Tenant code the account belongs to (e.g. ACME) — the same code used at login.',
    example: 'ACME',
  })
  @IsString()
  readonly tenantCode!: string;

  @ApiProperty({
    description: 'Email of the user account to rewind.',
    example: 'gatetest@example.com',
  })
  @IsEmail()
  readonly email!: string;

  @ApiPropertyOptional({
    description:
      'Password to set on the account. Omit to leave the current password in place.',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  readonly password?: string;

  @ApiPropertyOptional({
    description: 'Re-arm gate 1b — forced password change.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  readonly resetPasswordChange?: boolean;

  @ApiPropertyOptional({
    description: 'Re-arm gate 1c — deletes the user profile so !isOnboarded.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  readonly resetProfile?: boolean;

  @ApiPropertyOptional({
    description:
      'Re-arm gate 1c-bis — clears deviceBoundAt and deletes the handset binding.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  readonly resetDeviceBinding?: boolean;
}
