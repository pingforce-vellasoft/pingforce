import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { ReportQueryDto } from './dto/report-query.dto';
import { RbacService, ResolvedDataScope } from '../rbac/rbac.service';

interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const KPI_CACHE_TTL_MS = 60_000;

/**
 * Reports & analytics aggregates (3.5_ReportsAnalytics).
 *
 * Read-only, tenant-scoped rollups over the operational tables — no
 * reporting tables or schedule engine yet (REPORT_ARCHITECTURE.md's
 * schedule/custom-report engines are a later phase). KPI formulas follow
 * KPI_LIBRARY.md §4-§7; the dashboard snapshot is Redis-cached per tenant.
 */
@Injectable()
export class ReportsService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly rbacService: RbacService,
  ) {}

  /**
   * Reports are generated with the caller's effective data scope
   * (DataScope.md §9 "Reports", §15 dashboards).
   */
  async resolveReportScope(
    tenantId: string,
    requesterUserId: string,
  ): Promise<ResolvedDataScope> {
    return this.rbacService.resolveScopeIds(
      tenantId,
      requesterUserId,
      'REPORTS',
      ['READ'],
    );
  }

  /** Attendance summary per employee (KPI_LIBRARY.md §4). */
  async attendanceReport(
    tenantId: string,
    requesterUserId: string,
    query: ReportQueryDto,
  ) {
    const range = this.resolveRange(query);
    const scope = await this.resolveReportScope(tenantId, requesterUserId);
    if (
      scope.kind === 'NONE' ||
      (scope.kind === 'IDS' && scope.employeeIds.length === 0)
    ) {
      return { range, rows: [] };
    }
    const scopeFilter =
      scope.kind === 'IDS'
        ? Prisma.sql`AND e."id" IN (${Prisma.join([...scope.employeeIds])})`
        : Prisma.empty;
    const employeeFilter = query.employeeId
      ? Prisma.sql`AND e."id" = ${query.employeeId}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      {
        employeeId: string;
        employeeCode: string;
        firstName: string;
        lastName: string;
        presentDays: number;
        lateDays: number;
        halfDays: number;
        sessions: number;
        totalHours: number;
      }[]
    >`
      SELECT
        e."id"           AS "employeeId",
        e."employeeCode" AS "employeeCode",
        e."firstName"    AS "firstName",
        e."lastName"     AS "lastName",
        COUNT(DISTINCT a."attendanceDate") FILTER (WHERE a."status" = 'PRESENT')::int  AS "presentDays",
        COUNT(DISTINCT a."attendanceDate") FILTER (WHERE a."status" = 'LATE')::int     AS "lateDays",
        COUNT(DISTINCT a."attendanceDate") FILTER (WHERE a."status" = 'HALF_DAY')::int AS "halfDays",
        COUNT(s."id")::int AS "sessions",
        COALESCE(ROUND((SUM(EXTRACT(EPOCH FROM (s."punchOut" - s."punchIn"))) / 3600)::numeric, 2), 0)::float AS "totalHours"
      FROM "employees" e
      LEFT JOIN "attendances" a
        ON a."employeeId" = e."id"
        AND a."deletedAt" IS NULL
        AND a."attendanceDate" >= ${range.from}
        AND a."attendanceDate" <= ${range.to}
      LEFT JOIN "attendance_sessions" s
        ON s."attendanceId" = a."id"
        AND s."deletedAt" IS NULL
        AND s."punchOut" IS NOT NULL
      WHERE e."tenantId" = ${tenantId} AND e."deletedAt" IS NULL ${scopeFilter} ${employeeFilter}
      GROUP BY e."id", e."employeeCode", e."firstName", e."lastName"
      ORDER BY e."employeeCode";
    `;

    return { range, rows };
  }

  /** Visit status/completion/GPS-compliance rollup (KPI_LIBRARY.md §5). */
  async visitsReport(
    tenantId: string,
    requesterUserId: string,
    query: ReportQueryDto,
  ) {
    const range = this.resolveRange(query);
    const scope = await this.resolveReportScope(tenantId, requesterUserId);
    if (scope.kind === 'NONE') {
      return {
        range,
        total: 0,
        byStatus: {},
        completed: 0,
        completionRate: null,
        gpsComplianceRate: null,
        executedWithDuration: 0,
        avgDurationMinutes: null,
      };
    }
    const where = {
      tenantId,
      ...this.visitScopeWhere(scope),
      plannedStartAt: { gte: range.from, lte: range.to },
      ...(query.employeeId && { employeeId: query.employeeId }),
      ...(query.customerId && { customerId: query.customerId }),
    };

    const [byStatus, total, started, gpsValidated, duration] =
      await Promise.all([
        this.prisma.visit.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.prisma.visit.count({ where }),
        this.prisma.visit.count({
          where: { ...where, actualStartAt: { not: null } },
        }),
        this.prisma.visit.count({ where: { ...where, gpsValidated: true } }),
        this.prisma.visit.aggregate({
          where: {
            ...where,
            actualStartAt: { not: null },
            actualEndAt: { not: null },
          },
          _count: { _all: true },
        }),
      ]);

    const completed = byStatus
      .filter((s) => ['COMPLETED', 'APPROVED', 'CLOSED'].includes(s.status))
      .reduce((sum, s) => sum + s._count._all, 0);

    // avg duration needs an interval aggregate — raw query
    const employeeFilter = query.employeeId
      ? Prisma.sql`AND "employeeId" = ${query.employeeId}`
      : Prisma.empty;
    const customerFilter = query.customerId
      ? Prisma.sql`AND "customerId" = ${query.customerId}`
      : Prisma.empty;
    const scopeFilter =
      scope.kind === 'IDS'
        ? Prisma.sql`AND (${
            scope.employeeIds.length
              ? Prisma.sql`"employeeId" IN (${Prisma.join([...scope.employeeIds])})`
              : Prisma.sql`FALSE`
          } OR "createdBy" IN (${Prisma.join([...scope.userIds])}))`
        : Prisma.empty;
    const avg = await this.prisma.$queryRaw<{ avgMinutes: number | null }[]>`
      SELECT ROUND((AVG(EXTRACT(EPOCH FROM ("actualEndAt" - "actualStartAt"))) / 60)::numeric, 1)::float AS "avgMinutes"
      FROM "visits"
      WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
        AND "actualStartAt" IS NOT NULL AND "actualEndAt" IS NOT NULL
        AND "plannedStartAt" >= ${range.from} AND "plannedStartAt" <= ${range.to}
        ${scopeFilter} ${employeeFilter} ${customerFilter};
    `;

    return {
      range,
      total,
      byStatus: Object.fromEntries(
        byStatus.map((s) => [s.status, s._count._all]),
      ),
      completed,
      completionRate: this.rate(completed, total),
      gpsComplianceRate: this.rate(gpsValidated, started),
      executedWithDuration: duration._count._all,
      avgDurationMinutes: avg[0]?.avgMinutes ?? null,
    };
  }

  /** Fault volume, SLA compliance and resolution time (KPI_LIBRARY.md §6). */
  async faultsReport(
    tenantId: string,
    requesterUserId: string,
    query: ReportQueryDto,
  ) {
    const range = this.resolveRange(query);
    const scope = await this.resolveReportScope(tenantId, requesterUserId);
    if (scope.kind === 'NONE') {
      return {
        range,
        total: 0,
        byStatus: {},
        open: 0,
        closed: 0,
        slaBreached: 0,
        slaComplianceRate: null,
        avgResolutionHours: null,
      };
    }
    const where = {
      tenantId,
      ...this.faultScopeWhere(scope),
      createdAt: { gte: range.from, lte: range.to },
      ...(query.customerId && { customerId: query.customerId }),
    };

    const [byStatus, total, escalated] = await Promise.all([
      this.prisma.fault.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.fault.count({ where }),
      this.prisma.fault.count({ where: { ...where, isEscalated: true } }),
    ]);

    const customerFilter = query.customerId
      ? Prisma.sql`AND "customerId" = ${query.customerId}`
      : Prisma.empty;
    const scopeFilter =
      scope.kind === 'IDS'
        ? Prisma.sql`AND ("assignedToId" IN (${Prisma.join([...scope.userIds])}) OR "createdBy" IN (${Prisma.join([...scope.userIds])}))`
        : Prisma.empty;
    const resolution = await this.prisma.$queryRaw<
      { avgHours: number | null }[]
    >`
      SELECT ROUND((AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))) / 3600)::numeric, 1)::float AS "avgHours"
      FROM "faults"
      WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
        AND "status" IN ('RESOLVED', 'CLOSED')
        AND "createdAt" >= ${range.from} AND "createdAt" <= ${range.to}
        ${scopeFilter} ${customerFilter};
    `;

    const statusMap = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count._all]),
    );
    const open = (statusMap['OPEN'] ?? 0) + (statusMap['IN_PROGRESS'] ?? 0);
    const closed = (statusMap['RESOLVED'] ?? 0) + (statusMap['CLOSED'] ?? 0);

    return {
      range,
      total,
      byStatus: statusMap,
      open,
      closed,
      slaBreached: escalated,
      slaComplianceRate: total > 0 ? this.rate(total - escalated, total) : null,
      avgResolutionHours: resolution[0]?.avgHours ?? null,
    };
  }

  /** Lead funnel + conversion + pipeline value (KPI_LIBRARY.md §7). */
  async leadsReport(
    tenantId: string,
    requesterUserId: string,
    query: ReportQueryDto,
  ) {
    const range = this.resolveRange(query);
    const scope = await this.resolveReportScope(tenantId, requesterUserId);
    if (scope.kind === 'NONE') {
      return {
        range,
        newLeads: 0,
        convertedLeads: 0,
        conversionRate: null,
        pipeline: [],
      };
    }
    const leadScope = this.leadScopeWhere(scope);
    const where = {
      tenantId,
      ...leadScope,
      createdAt: { gte: range.from, lte: range.to },
    };

    const [total, converted, pipeline, stages] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({
        where: {
          tenantId,
          ...leadScope,
          convertedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.lead.groupBy({
        by: ['pipelineStageId'],
        where,
        _count: { _all: true },
        _sum: { expectedValue: true },
      }),
      this.prisma.pipelineStage.findMany({
        where: { tenantId },
        select: { id: true, name: true, order: true },
        orderBy: { order: 'asc' },
      }),
    ]);

    const stageName = new Map(stages.map((s) => [s.id, s.name]));

    return {
      range,
      newLeads: total,
      convertedLeads: converted,
      conversionRate: this.rate(converted, total),
      pipeline: pipeline.map((p) => ({
        stageId: p.pipelineStageId,
        stage: p.pipelineStageId
          ? (stageName.get(p.pipelineStageId) ?? 'Unknown')
          : 'Unassigned',
        count: p._count._all,
        expectedValue: p._sum.expectedValue ?? 0,
      })),
    };
  }

  /**
   * Cross-module KPI snapshot for dashboard cards
   * (KPI_LIBRARY.md §12 manager dashboard). Cached per tenant for 60s.
   */
  async kpiSummary(tenantId: string, requesterUserId: string) {
    const scope = await this.resolveReportScope(tenantId, requesterUserId);
    if (scope.kind === 'NONE') {
      return {
        generatedAt: new Date().toISOString(),
        workforce: {
          activeEmployees: 0,
          presentToday: 0,
          attendanceRate: null,
        },
        visits: { active: 0, completedToday: 0 },
        faults: { open: 0, slaBreached: 0 },
        leads: {
          newLast30Days: 0,
          convertedLast30Days: 0,
          conversionRate: null,
        },
      };
    }
    // Scoped snapshots are cached per caller so one user's view never leaks
    // to another (DataScope.md §15).
    const cacheKey =
      scope.kind === 'ALL'
        ? `reports_kpis_${tenantId}`
        : `reports_kpis_${tenantId}_${requesterUserId}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const employeeScope =
      scope.kind === 'IDS' ? { id: { in: [...scope.employeeIds] } } : {};
    const employeeIdScope =
      scope.kind === 'IDS'
        ? { employeeId: { in: [...scope.employeeIds] } }
        : {};
    const visitScope = this.visitScopeWhere(scope);
    const faultScope = this.faultScopeWhere(scope);
    const leadScope = this.leadScopeWhere(scope);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last30 = new Date(Date.now() - 30 * DAY_MS);

    const [
      activeEmployees,
      presentToday,
      activeVisits,
      completedVisitsToday,
      openFaults,
      breachedFaults,
      newLeads30d,
      converted30d,
    ] = await Promise.all([
      this.prisma.employee.count({
        where: { tenantId, ...employeeScope, employmentStatus: 'ACTIVE' },
      }),
      this.prisma.attendance.count({
        where: {
          tenantId,
          ...employeeIdScope,
          attendanceDate: today,
          status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] },
        },
      }),
      this.prisma.visit.count({
        where: {
          tenantId,
          ...visitScope,
          status: { in: ['STARTED', 'PAUSED'] },
        },
      }),
      this.prisma.visit.count({
        where: {
          tenantId,
          ...visitScope,
          status: 'COMPLETED',
          actualEndAt: { gte: today },
        },
      }),
      this.prisma.fault.count({
        where: {
          tenantId,
          ...faultScope,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.fault.count({
        where: {
          tenantId,
          ...faultScope,
          isEscalated: true,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.lead.count({
        where: { tenantId, ...leadScope, createdAt: { gte: last30 } },
      }),
      this.prisma.lead.count({
        where: { tenantId, ...leadScope, convertedAt: { gte: last30 } },
      }),
    ]);

    const summary = {
      generatedAt: new Date().toISOString(),
      workforce: {
        activeEmployees,
        presentToday,
        attendanceRate: this.rate(presentToday, activeEmployees),
      },
      visits: { active: activeVisits, completedToday: completedVisitsToday },
      faults: { open: openFaults, slaBreached: breachedFaults },
      leads: {
        newLast30Days: newLeads30d,
        convertedLast30Days: converted30d,
        conversionRate: this.rate(converted30d, newLeads30d),
      },
    };

    await this.cacheManager.set(cacheKey, summary, KPI_CACHE_TTL_MS);
    return summary;
  }

  // --------------------------------------------------------------- helpers

  /** Visits: assigned employee in scope OR created by a user in scope. */
  visitScopeWhere(scope: ResolvedDataScope): Record<string, unknown> {
    if (scope.kind !== 'IDS') return {};
    return {
      OR: [
        { employeeId: { in: [...scope.employeeIds] } },
        { createdBy: { in: [...scope.userIds] } },
      ],
    };
  }

  /** Faults: assignee or creator in scope (DataScope.md §9). */
  faultScopeWhere(scope: ResolvedDataScope): Record<string, unknown> {
    if (scope.kind !== 'IDS') return {};
    return {
      OR: [
        { assignedToId: { in: [...scope.userIds] } },
        { createdBy: { in: [...scope.userIds] } },
      ],
    };
  }

  /** Leads: owner or creator in scope (DataScope.md §9). */
  leadScopeWhere(scope: ResolvedDataScope): Record<string, unknown> {
    if (scope.kind !== 'IDS') return {};
    return {
      OR: [
        { ownerUserId: { in: [...scope.userIds] } },
        { createdBy: { in: [...scope.userIds] } },
      ],
    };
  }

  private resolveRange(query: ReportQueryDto): DateRange {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * DAY_MS);
    return { from, to };
  }

  private rate(part: number, whole: number): number | null {
    if (whole <= 0) return null;
    return Math.round((part / whole) * 10000) / 100;
  }
}
