import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class ManualCheckoutDto {
  @IsString()
  @IsNotEmpty()
  attendanceSessionId!: string;

  @IsDateString()
  @IsNotEmpty()
  checkoutTime!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
