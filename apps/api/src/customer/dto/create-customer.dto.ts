import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsObject,
  IsUUID,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  customerCode!: string;

  @IsString()
  @IsNotEmpty()
  legalName!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  customerType?: string;

  @IsEmail()
  @IsOptional()
  primaryEmail?: string;

  @IsString()
  @IsOptional()
  primaryMobile?: string;

  @IsString()
  @IsOptional()
  gstVat?: string;

  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;

  // Relations
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @IsUUID()
  @IsOptional()
  accountManagerId?: string;

  @IsUUID()
  @IsOptional()
  parentCustomerId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
