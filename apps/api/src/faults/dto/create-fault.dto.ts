import { IsString, IsOptional, IsEnum, IsUUID, IsNotEmpty } from 'class-validator';
import { FaultPriority } from '@pingforce-monorepo/shared';

export class CreateFaultDto {
  @IsString()
  @IsNotEmpty()
  faultNumber!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsEnum(FaultPriority)
  priority?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
