import { IsInt, IsNumber, IsUUID, Max, Min } from 'class-validator';

/** Sets an employee's yearly entitlement for one leave type. */
export class SetLeaveBalanceDto {
  @IsUUID()
  readonly leaveTypeId!: string;

  @IsInt()
  @Min(2000)
  @Max(2200)
  readonly year!: number;

  /** Whole or half days; used and reserved days are kept as they are. */
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(366)
  readonly totalDays!: number;
}
