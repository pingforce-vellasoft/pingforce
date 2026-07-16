import {
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DATA_SCOPE_LEVELS, DataScopeLevel } from '../rbac.service';

export class RoleGrantDto {
  @IsUUID('4')
  readonly permissionId!: string;

  @IsIn(DATA_SCOPE_LEVELS)
  readonly dataScope!: DataScopeLevel;
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  readonly permissionIds!: string[];

  /**
   * Optional per-permission data scope (DataScope.md §4). Permissions not
   * listed here default to OWN.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleGrantDto)
  readonly grants?: RoleGrantDto[];
}
