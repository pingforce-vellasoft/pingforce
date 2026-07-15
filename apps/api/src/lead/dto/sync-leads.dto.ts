import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsISO8601,
} from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';

/**
 * Offline-captured lead (3.4 LEAD_CAPTURE.md mobile capture).
 * leadNumber (client-generated, unique per tenant) is the idempotency key.
 */
export class OfflineLeadItemDto extends CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  readonly clientRef!: string;

  /** Original capture time on the device. */
  @IsISO8601()
  readonly timestamp!: string;
}

export class SyncLeadsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OfflineLeadItemDto)
  readonly leads!: OfflineLeadItemDto[];
}
