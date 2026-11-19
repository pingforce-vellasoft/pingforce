import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsObject,
  IsNumber,
  IsUUID,
} from 'class-validator';

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
  @IsUUID()
  @IsOptional()
  sourceId?: string;

  @IsUUID()
  @IsOptional()
  campaignId?: string;

  @IsUUID()
  @IsOptional()
  priorityId?: string;

  @IsUUID()
  @IsOptional()
  ownerUserId?: string;

  @IsUUID()
  @IsOptional()
  statusId?: string;

  @IsUUID()
  @IsOptional()
  pipelineStageId?: string;

  @IsObject()
  @IsOptional()
  tags?: any;

  @IsObject()
  @IsOptional()
  customFields?: any;
}
