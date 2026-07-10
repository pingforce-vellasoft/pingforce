import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateMasterDataDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  // Optional fields for LeaveType
  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;
}
