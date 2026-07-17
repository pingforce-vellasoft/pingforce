import { IsOptional, IsUUID } from 'class-validator';

export class MoveConnectionDto {
  /** New parent connection. Omit to re-attach directly to an OLTE root. */
  @IsOptional()
  @IsUUID()
  readonly newParentConnectionId?: string;

  /** Required when newParentConnectionId is omitted (root move). */
  @IsOptional()
  @IsUUID()
  readonly newOlteId?: string;
}
