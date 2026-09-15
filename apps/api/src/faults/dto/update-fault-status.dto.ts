import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { FaultState } from '../domain/fault-state';
import { NOTE_REQUIRED_STATES } from '../domain/fault-state';

/**
 * Fault statuses accepted on the wire. Kept as an alias of the state-machine
 * enum so the lifecycle has a single source of truth (domain/fault-state.ts).
 */
export const FaultStatus = FaultState;
export type FaultStatus = FaultState;

export class UpdateFaultStatusDto {
  @IsEnum(FaultState)
  status!: FaultState;

  @ValidateIf(
    (dto: UpdateFaultStatusDto) =>
      dto.notes !== undefined || NOTE_REQUIRED_STATES.includes(dto.status),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientRef?: string;
}
