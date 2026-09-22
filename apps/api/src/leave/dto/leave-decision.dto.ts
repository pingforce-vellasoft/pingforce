import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LeaveDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly reason?: string;
}

export class CancelLeaveDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  readonly reason!: string;
}
