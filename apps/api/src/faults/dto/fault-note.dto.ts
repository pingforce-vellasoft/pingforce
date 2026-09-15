import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AddFaultNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  readonly notes!: string;

  /**
   * Publish this note to the customer. Defaults to internal: staff notes are
   * working notes, and anything customer-facing must be a deliberate act.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  readonly isCustomerVisible?: boolean;
}

export class UpdateTimelineVisibilityDto {
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  readonly isCustomerVisible!: boolean;
}
