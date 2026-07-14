import { IsNotEmpty, IsString } from 'class-validator';

export class GeneratePayslipDto {
  @IsNotEmpty()
  @IsString()
  readonly employeeId!: string;

  @IsNotEmpty()
  @IsString()
  readonly payrollCycleId!: string;
}
