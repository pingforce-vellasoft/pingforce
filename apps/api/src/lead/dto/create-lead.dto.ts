import { IsString, IsNotEmpty, IsOptional, IsEmail, IsObject, IsNumber } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  leadNumber!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  alternateMobile?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsNumber()
  @IsOptional()
  expectedValue?: number;

  @IsString()
  @IsOptional()
  currencyCode?: string;

  @IsNumber()
  @IsOptional()
  qualificationScore?: number;

  // Relations
  @IsString()
  @IsOptional()
  sourceId?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  priorityId?: string;

  @IsString()
  @IsOptional()
  ownerUserId?: string;

  @IsString()
  @IsOptional()
  statusId?: string;

  @IsString()
  @IsOptional()
  pipelineStageId?: string;

  @IsObject()
  @IsOptional()
  tags?: any;

  @IsObject()
  @IsOptional()
  customFields?: any;
}
