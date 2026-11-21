import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ATTACHABLE_ENTITY_TYPES } from '../files.service';

export class UploadFileDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Z_]+$/, {
    message: 'entityType must be an UPPER_SNAKE_CASE entity name',
  })
  @IsIn(ATTACHABLE_ENTITY_TYPES, {
    message: `entityType must be one of: ${ATTACHABLE_ENTITY_TYPES.join(', ')}`,
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
