import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum FaultStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class UpdateFaultStatusDto {
  @IsEnum(FaultStatus)
  status!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
