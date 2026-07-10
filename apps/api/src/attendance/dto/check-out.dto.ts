import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CheckOutDto {
  @IsNotEmpty()
  @IsString()
  attendanceId!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
