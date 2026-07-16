import { IsIn, IsInt, Min } from 'class-validator';

/** AuditLogs.md §7 — configurable retention windows. */
export class UpdateRetentionPolicyDto {
  @IsInt()
  @IsIn([90, 180, 365, 1095, 2555])
  readonly retentionDays!: number;

  @IsInt()
  @Min(30)
  readonly archiveAfterDays!: number;
}
