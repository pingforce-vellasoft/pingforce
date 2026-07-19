import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { RbacService } from '../rbac/rbac.service';
import { PingBatchDto } from './dto/tracking.dto';

interface AuthUser {
  readonly userId: string;
  readonly tenantId: string;
  readonly role?: string;
}

// A trail can grow large (a 10-hour shift at 60s = 600 points). Cap the trail
// response so a wide time window can't return an unbounded result set.
const TRAIL_MAX_POINTS = 2000;

@Injectable()
export class TrackingService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly rbacService: RbacService,
  ) {}

  /**
   * Ingest a batch of background location pings for the CALLER's own employee
   * record. Idempotent on (employeeId, clientRef) via createMany + skipDuplicates
   * so retried offline uploads never create duplicate breadcrumbs.
   */
  async ingestBatch(user: AuthUser, dto: PingBatchDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });
    if (!employee) throw new UnauthorizedException('Not an employee');

    // Newest ping in the batch drives the live-map position. Batches can arrive
    // out of order after an offline flush, so pick the max capturedAt.
    const newest = dto.pings.reduce((a, b) =>
      new Date(a.capturedAt) >= new Date(b.capturedAt) ? a : b,
    );

    const capturedAt = new Date(newest.capturedAt);

    // History append + current-position upsert in one round-trip. History write
    // is idempotent (unique employeeId+clientRef). The latest row is a
    // conflict-guarded upsert: DO UPDATE only when this fix is NEWER than the
    // stored one, so an out-of-order offline flush can't rewind the live map.
    const [result] = await this.prisma.$transaction([
      this.prisma.employeeLocation.createMany({
        data: dto.pings.map((p) => ({
          tenantId: user.tenantId,
          employeeId: employee.id,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy ?? null,
          speed: p.speed ?? null,
          batteryLevel: p.batteryLevel ?? null,
          provider: p.provider ?? null,
          capturedAt: new Date(p.capturedAt),
          clientRef: p.clientRef,
        })),
        skipDuplicates: true,
      }),
      this.prisma.$executeRaw`
        INSERT INTO "latest_employee_locations"
          ("employeeId", "tenantId", "latitude", "longitude", "accuracy",
           "speed", "batteryLevel", "capturedAt", "updatedAt")
        VALUES
          (${employee.id}, ${user.tenantId}, ${newest.latitude},
           ${newest.longitude}, ${newest.accuracy ?? null},
           ${newest.speed ?? null}, ${newest.batteryLevel ?? null},
           ${capturedAt}, NOW())
        ON CONFLICT ("employeeId") DO UPDATE SET
          "tenantId" = EXCLUDED."tenantId",
          "latitude" = EXCLUDED."latitude",
          "longitude" = EXCLUDED."longitude",
          "accuracy" = EXCLUDED."accuracy",
          "speed" = EXCLUDED."speed",
          "batteryLevel" = EXCLUDED."batteryLevel",
          "capturedAt" = EXCLUDED."capturedAt",
          "updatedAt" = NOW()
        WHERE "latest_employee_locations"."capturedAt" < EXCLUDED."capturedAt"
      `,
    ]);

    return { accepted: result.count, received: dto.pings.length };
  }

  /**
   * Latest known position per operator the caller may view. Scope follows
   * TRACKING:VIEW_LIVE (admins ALL, managers their team) via the same resolver
   * the attendance list uses.
   */
  async getLive(user: AuthUser) {
    const scope = await this.rbacService.resolveScopeIds(
      user.tenantId,
      user.userId,
      'TRACKING',
      ['VIEW_LIVE'],
    );
    const scopeWhere = this.rbacService.employeeScopeWhere(scope);
    if (scopeWhere === null) return { data: [] };

    // Reads the current-position table (one row per employee), so the result
    // is bounded to headcount regardless of how large the breadcrumb history
    // grows — no DISTINCT ON scan.
    const rows = await this.prisma.latestEmployeeLocation.findMany({
      where: { tenantId: user.tenantId, ...scopeWhere },
      orderBy: { capturedAt: 'desc' },
      select: {
        employeeId: true,
        latitude: true,
        longitude: true,
        accuracy: true,
        speed: true,
        batteryLevel: true,
        capturedAt: true,
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      data: rows.map((r) => ({
        employeeId: r.employeeId,
        employeeCode: r.employee?.employeeCode ?? null,
        name: [r.employee?.firstName, r.employee?.lastName]
          .filter(Boolean)
          .join(' '),
        latitude: r.latitude,
        longitude: r.longitude,
        accuracy: r.accuracy,
        speed: r.speed,
        batteryLevel: r.batteryLevel,
        capturedAt: r.capturedAt,
      })),
    };
  }

  /**
   * Time-bounded breadcrumb trail for one operator, oldest→newest. Enforces the
   * caller's TRACKING:VIEW_LIVE scope so a manager can't read outside their team.
   */
  async getTrail(
    user: AuthUser,
    employeeId: string,
    from?: string,
    to?: string,
  ) {
    const scope = await this.rbacService.resolveScopeIds(
      user.tenantId,
      user.userId,
      'TRACKING',
      ['VIEW_LIVE'],
    );
    if (scope.kind === 'NONE') {
      throw new NotFoundException('Operator not found');
    }
    // Scope check is in-memory — no extra probe query. ALL scope needs only the
    // tenant filter on the trail query below; IDS scope must contain the target.
    if (scope.kind === 'IDS' && !scope.employeeIds.includes(employeeId)) {
      throw new NotFoundException('Operator not found');
    }

    const capturedAt: Record<string, Date> = {};
    if (from) capturedAt.gte = new Date(from);
    if (to) capturedAt.lte = new Date(to);

    const points = await this.prisma.employeeLocation.findMany({
      where: {
        tenantId: user.tenantId,
        employeeId,
        ...(from || to ? { capturedAt } : {}),
      },
      orderBy: { capturedAt: 'asc' },
      take: TRAIL_MAX_POINTS,
      select: {
        latitude: true,
        longitude: true,
        accuracy: true,
        speed: true,
        capturedAt: true,
      },
    });

    return {
      employeeId,
      points,
      truncated: points.length === TRAIL_MAX_POINTS,
    };
  }

  /**
   * Consolidated daily summaries for one operator (field-time + top places),
   * newest day first. Same TRACKING:VIEW_LIVE scope as the live/trail reads.
   */
  async getDailySummaries(
    user: AuthUser,
    employeeId: string,
    limit = 90,
  ) {
    const scope = await this.rbacService.resolveScopeIds(
      user.tenantId,
      user.userId,
      'TRACKING',
      ['VIEW_LIVE'],
    );
    if (scope.kind === 'NONE') {
      throw new NotFoundException('Operator not found');
    }
    if (scope.kind === 'IDS' && !scope.employeeIds.includes(employeeId)) {
      throw new NotFoundException('Operator not found');
    }

    const days = await this.prisma.dailyLocationSummary.findMany({
      where: { tenantId: user.tenantId, employeeId },
      orderBy: { day: 'desc' },
      take: Math.min(Math.max(limit, 1), 365),
      select: {
        day: true,
        minutesInField: true,
        firstFixAt: true,
        lastFixAt: true,
        pointCount: true,
        topPlaces: true,
      },
    });

    return { employeeId, days };
  }
}
