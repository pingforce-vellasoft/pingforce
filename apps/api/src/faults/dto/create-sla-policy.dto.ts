import { IsString, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { FaultPriority } from '@pingforce-monorepo/shared';

export class CreateSlaPolicyDto {
  @IsEnum(FaultPriority)
  priority!: FaultPriority;

  @IsInt()
  @Min(1)
  resolveInHours!: number;

  @IsOptional()
  @IsString()
  escalateToId?: string;
}
