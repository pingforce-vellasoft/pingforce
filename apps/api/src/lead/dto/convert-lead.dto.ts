import { IsString, IsOptional, IsUUID, IsNotEmpty } from 'class-validator';

/** Body for POST /leads/:id/convert (3.4 CUSTOMER_CONVERSION.md §16). */
export class ConvertLeadDto {
  /** Defaults to the lead's company name, else "firstName lastName". */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly legalName?: string;

  @IsOptional()
  @IsString()
  readonly displayName?: string;

  @IsOptional()
  @IsString()
  readonly customerType?: string;

  @IsOptional()
  @IsString()
  readonly notes?: string;

  /**
   * Duplicate resolution (§7): link the lead to this existing customer
   * instead of creating a new record.
   */
  @IsOptional()
  @IsUUID()
  readonly mergeWithCustomerId?: string;
}
