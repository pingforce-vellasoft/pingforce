import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateSalaryStructureDto {
  @IsNotEmpty()
  @IsString()
  readonly employeeId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly basicPay!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly hra!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly specialAllowance!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  readonly standardDeductions!: number;
}
