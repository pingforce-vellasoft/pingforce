import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UploadFileDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Z_]+$/, {
    message: 'entityType must be an UPPER_SNAKE_CASE entity name',
  })
  readonly entityType!: string;

  @IsString()
  @MaxLength(64)
  readonly entityId!: string;

  /**
   * Whether a customer may see this attachment. Uploads arrive as multipart
   * form fields, so the flag comes in as a string and is coerced here.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  readonly isCustomerVisible?: boolean;
}
