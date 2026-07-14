import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class AssignShiftDto {
  @IsNotEmpty()
  @IsString()
  readonly employeeId!: string;

  @IsNotEmpty()
  @IsString()
  readonly shiftId!: string;

  @IsNotEmpty()
  @IsDateString()
  readonly effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  readonly effectiveTo?: string;
}
