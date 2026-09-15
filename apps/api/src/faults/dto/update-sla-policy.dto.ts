import { FaultPriority } from '@pingforce-monorepo/shared';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class UpdateSlaPolicyDto {
  @IsOptional()
  @IsEnum(FaultPriority)
  readonly priority?: FaultPriority;

  @IsOptional()
  @IsInt()
  @Min(1)
  readonly resolveInHours?: number;

  /** Set null to remove the escalation recipient. */
  @IsOptional()
  @IsUUID()
  readonly escalateToId?: string | null;
}
