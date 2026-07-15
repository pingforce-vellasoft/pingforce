import { IsOptional, IsISO8601, IsUUID, IsIn } from 'class-validator';

/** Standard report filters (3.5 API.md §13). */
export class ReportQueryDto {
  @IsOptional()
  @IsISO8601()
  readonly from?: string;

  @IsOptional()
  @IsISO8601()
  readonly to?: string;

  @IsOptional()
  @IsUUID()
  readonly employeeId?: string;

  @IsOptional()
  @IsUUID()
  readonly customerId?: string;
}

export const EXPORT_REPORT_TYPES = [
  'attendance',
  'visits',
  'faults',
  'leads',
] as const;
export type ExportReportType = (typeof EXPORT_REPORT_TYPES)[number];

export class ExportQueryDto extends ReportQueryDto {
  @IsIn(EXPORT_REPORT_TYPES)
  readonly type!: ExportReportType;
}
