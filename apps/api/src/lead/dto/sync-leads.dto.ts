import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsISO8601,
  IsOptional,
  IsUUID,
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

/** A stage change made on the device while offline. */
export class OfflineLeadStageMoveDto {
  @IsString()
  @IsNotEmpty()
  readonly clientRef!: string;

  /** When the move was made on the device. */
  @IsISO8601()
  readonly timestamp!: string;

  @IsUUID()
  readonly leadId!: string;

  @IsUUID()
  readonly pipelineStageId!: string;
}

/** At least one of `leads` and `stageMoves` must be non-empty. */
export class SyncLeadsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OfflineLeadItemDto)
  readonly leads?: OfflineLeadItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OfflineLeadStageMoveDto)
  readonly stageMoves?: OfflineLeadStageMoveDto[];
}
