import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OnboardingTenantDto {
  @ApiProperty({ description: 'First name of the user' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ description: 'Last name of the user' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ description: 'Mobile phone number (mandatory)' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ description: 'The official name of the company/tenant' })
  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @ApiProperty({ description: 'Industry category', required: false })
  @IsString()
  @IsOptional()
  industry?: string;
}
