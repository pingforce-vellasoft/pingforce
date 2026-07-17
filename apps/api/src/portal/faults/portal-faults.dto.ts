import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PortalCreateFaultDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  readonly description!: string;

  /** Optional link to one of the customer's own connections. */
  @IsOptional()
  @IsUUID()
  readonly connectionId?: string;
}

export class PortalFaultCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  readonly notes!: string;
}

export class PortalFaultRatingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  readonly rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly comment?: string;
}

export class PortalFaultListQueryDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  readonly status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly take?: number;
}
