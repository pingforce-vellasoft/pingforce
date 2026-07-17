import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SCOPE_OVERRIDE_TYPES, ScopeOverrideType } from '../rbac.service';

/** One CUSTOM data-scope rule (DataScope.md §12 — user_scope_overrides). */
export class CreateScopeOverrideDto {
  @IsUUID('4')
  readonly userId!: string;

  /** Business module the rule applies to; omit for every module. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly module?: string;

  @IsIn(SCOPE_OVERRIDE_TYPES)
  readonly scopeType!: ScopeOverrideType;

  /** Employee id (EMPLOYEE/TEAM) or org-unit id, per scopeType. */
  @IsUUID('4')
  readonly targetId!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly validFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly validUntil?: Date;
}
