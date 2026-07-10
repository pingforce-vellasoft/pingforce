import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateShiftDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  code!: string;

  @IsNotEmpty()
  @IsString()
  startTime!: string; // e.g., "09:00"

  @IsNotEmpty()
  @IsString()
  endTime!: string; // e.g., "18:00"

  @IsOptional()
  @IsNumber()
  gracePeriod?: number;
}
