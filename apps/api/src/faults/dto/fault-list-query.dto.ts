import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FaultPriority } from '@pingforce-monorepo/shared';
import { FaultState } from '../domain/fault-state';

/** Splits `?status=A,B` and `?status=A&status=B` into a string array. */
const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
};

const toBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return value === true || value === 'true' || value === '1';
};

export const FAULT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'slaDeadline',
  'priority',
  'status',
] as const;

export class FaultListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(FaultState, { each: true })
  status?: FaultState[];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(FaultPriority, { each: true })
  priority?: string[];

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsIn(['STAFF', 'PORTAL', 'MOBILE'])
  channel?: string;

  /** True → only faults past their SLA deadline and not yet resolved. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  slaBreached?: boolean;

  /** True → only faults with no assignee. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  unassigned?: boolean;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  /** Free-text match on fault number or title. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(FAULT_SORT_FIELDS)
  sortBy?: (typeof FAULT_SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
