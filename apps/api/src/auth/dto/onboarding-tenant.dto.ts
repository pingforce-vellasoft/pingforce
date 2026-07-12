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

  @ApiProperty({ description: 'Legal Company Name', required: false })
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiProperty({ description: 'Company Address', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'City', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'State', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'Theme Color hex code', required: false })
  @IsString()
  @IsOptional()
  themeColor?: string;
}
