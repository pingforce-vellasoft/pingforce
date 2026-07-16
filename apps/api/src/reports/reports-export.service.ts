import { Injectable, Inject } from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { CurrentUserContext } from '@pingforce-monorepo/shared';
import { AuditService } from '../audit/audit.service';
import { ReportsService } from './reports.service';
import { ExportQueryDto, ExportReportType } from './dto/report-query.dto';

const EXPORT_ROW_LIMIT = 10_000;

const VISITS_HEADERS = [
  'visitNumber',
  'visitType',
  'status',
  'priority',
  'purpose',
  'employeeCode',
  'customerCode',
  'plannedStartAt',
  'actualStartAt',
  'actualEndAt',
  'gpsValidated',
  'outcome',
] as const;

const FAULTS_HEADERS = [
  'faultNumber',
  'title',
  'status',
  'priority',
  'customerCode',
  'createdAt',
  'slaDeadline',
  'isEscalated',
  'escalationLevel',
] as const;

const LEADS_HEADERS = [
  'leadNumber',
  'firstName',
  'lastName',
  'companyName',
  'email',
  'mobile',
  'expectedValue',
  'stage',
  'convertedAt',
  'createdAt',
] as const;

/**
 * Synchronous CSV exports (3.5 EXPORTS.md — CSV only for now; Excel/PDF and
 * async job processing are a later phase). Every export is audit-logged
 * (RBAC.md §10 "Report exports").
 */
@Injectable()
export class ReportsExportService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly reportsService: ReportsService,
    private readonly auditService: AuditService,
  ) {}

  async exportCsv(
    tenantId: string,
    actor: CurrentUserContext,
    query: ExportQueryDto,
  ): Promise<{ filename: string; csv: string }> {
    const csv = await this.buildCsv(tenantId, actor, query);
    const filename = `${query.type}-report-${new Date().toISOString().slice(0, 10)}.csv`;

    void this.auditService.log({
      tenantId,
      actorId: actor.userId,
      module: 'REPORTS',
      entityName: 'report_export',
      entityId: query.type,
      action: 'EXPORT',
      newValue: { type: query.type, from: query.from, to: query.to },
    });

    return { filename, csv };
  }

  private async buildCsv(
    tenantId: string,
    actor: CurrentUserContext,
    query: ExportQueryDto,
  ): Promise<string> {
    // Exports inherit the caller's effective data scope (DataScope.md §14).
    const scope = await this.reportsService.resolveReportScope(
      tenantId,
      actor.userId,
    );
    switch (query.type as ExportReportType) {
      case 'attendance': {
        const report = await this.reportsService.attendanceReport(
          tenantId,
          actor.userId,
          query,
        );
        return this.toCsv(
          [
            'employeeCode',
            'firstName',
            'lastName',
            'presentDays',
            'lateDays',
            'halfDays',
            'sessions',
            'totalHours',
          ],
          report.rows,
        );
      }
      case 'visits': {
        if (scope.kind === 'NONE') return this.toCsv(VISITS_HEADERS, []);
        const range = this.range(query);
        const rows = await this.prisma.visit.findMany({
          where: {
            tenantId,
            ...this.reportsService.visitScopeWhere(scope),
            plannedStartAt: { gte: range.from, lte: range.to },
            ...(query.employeeId && { employeeId: query.employeeId }),
            ...(query.customerId && { customerId: query.customerId }),
          },
          select: {
            visitNumber: true,
            visitType: true,
            status: true,
            priority: true,
            purpose: true,
            plannedStartAt: true,
            actualStartAt: true,
            actualEndAt: true,
            gpsValidated: true,
            outcome: true,
            employee: { select: { employeeCode: true } },
            customer: { select: { customerCode: true } },
          },
          orderBy: { plannedStartAt: 'desc' },
          take: EXPORT_ROW_LIMIT,
        });
        return this.toCsv(
          VISITS_HEADERS,
          rows.map((v) => ({
            ...v,
            employeeCode: v.employee?.employeeCode ?? '',
            customerCode: v.customer?.customerCode ?? '',
          })),
        );
      }
      case 'faults': {
        if (scope.kind === 'NONE') return this.toCsv(FAULTS_HEADERS, []);
        const range = this.range(query);
        const rows = await this.prisma.fault.findMany({
          where: {
            tenantId,
            ...this.reportsService.faultScopeWhere(scope),
            createdAt: { gte: range.from, lte: range.to },
            ...(query.customerId && { customerId: query.customerId }),
          },
          select: {
            faultNumber: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            slaDeadline: true,
            isEscalated: true,
            escalationLevel: true,
            customer: { select: { customerCode: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: EXPORT_ROW_LIMIT,
        });
        return this.toCsv(
          FAULTS_HEADERS,
          rows.map((f) => ({
            ...f,
            customerCode: f.customer?.customerCode ?? '',
          })),
        );
      }
      case 'leads': {
        if (scope.kind === 'NONE') return this.toCsv(LEADS_HEADERS, []);
        const range = this.range(query);
        const rows = await this.prisma.lead.findMany({
          where: {
            tenantId,
            ...this.reportsService.leadScopeWhere(scope),
            createdAt: { gte: range.from, lte: range.to },
          },
          select: {
            leadNumber: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            mobile: true,
            expectedValue: true,
            convertedAt: true,
            createdAt: true,
            pipelineStage: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: EXPORT_ROW_LIMIT,
        });
        return this.toCsv(
          LEADS_HEADERS,
          rows.map((l) => ({ ...l, stage: l.pipelineStage?.name ?? '' })),
        );
      }
    }
  }

  private range(query: ExportQueryDto): { from: Date; to: Date } {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  private toCsv(
    headers: readonly string[],
    rows: readonly Record<string, unknown>[],
  ): string {
    const escape = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      let str = value instanceof Date ? value.toISOString() : String(value);
      // CSV/formula-injection guard (CWE-1236): a leading = + - @ tab or CR
      // makes Excel/Sheets evaluate the cell as a formula. Neutralize with a
      // leading single quote (rendered as text, ignored by spreadsheets).
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(','));
    }
    return lines.join('\r\n');
  }
}
