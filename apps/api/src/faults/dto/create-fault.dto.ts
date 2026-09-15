import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { FaultPriority } from '@pingforce-monorepo/shared';

export class CreateFaultDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  faultNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsEnum(FaultPriority)
  priority?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  /** Assign a field-created fault to the authenticated technician. */
  @IsOptional()
  @IsBoolean()
  assignToSelf?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subCategory?: string;

  /**
   * Linkage seam for the Connection Map module — stored but not yet related
   * or validated against a connection record.
   */
  @IsOptional()
  @IsUUID()
  connectionId?: string;
}
