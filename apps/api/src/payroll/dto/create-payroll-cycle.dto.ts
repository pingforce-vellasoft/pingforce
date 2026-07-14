import { IsInt, Max, Min } from 'class-validator';

export class CreatePayrollCycleDto {
  @IsInt()
  @Min(1)
  @Max(12)
  readonly month!: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  readonly year!: number;
}
