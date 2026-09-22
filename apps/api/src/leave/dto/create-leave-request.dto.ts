import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  MaxLength,
  IsUUID,
  Matches,
  IsIn,
} from 'class-validator';

export class CreateLeaveRequestDto {
  @IsNotEmpty()
  @IsUUID()
  readonly leaveTypeId!: string;

  @IsNotEmpty()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  readonly startDate!: string;

  @IsNotEmpty()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  readonly endDate!: string;

  @IsOptional()
  @IsIn(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'])
  readonly duration: 'FULL_DAY' | 'FIRST_HALF' | 'SECOND_HALF' = 'FULL_DAY';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly reason?: string;
}
