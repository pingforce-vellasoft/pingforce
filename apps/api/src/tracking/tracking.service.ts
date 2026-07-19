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

    const result = await this.prisma.employeeLocation.createMany({
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
    });

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

    // Latest row per employee: distinct on employeeId with capturedAt desc.
    const rows = await this.prisma.employeeLocation.findMany({
      where: { tenantId: user.tenantId, ...scopeWhere },
      distinct: ['employeeId'],
      orderBy: [{ employeeId: 'asc' }, { capturedAt: 'desc' }],
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
  async getTrail(user: AuthUser, employeeId: string, from?: string, to?: string) {
    const scope = await this.rbacService.resolveScopeIds(
      user.tenantId,
      user.userId,
      'TRACKING',
      ['VIEW_LIVE'],
    );
    const scopeWhere = this.rbacService.employeeScopeWhere(scope);
    if (scopeWhere === null) throw new NotFoundException('Operator not found');

    // The requested employee must fall within the caller's visible scope.
    const visible = await this.prisma.employeeLocation.findFirst({
      where: { tenantId: user.tenantId, employeeId, ...scopeWhere },
      select: { id: true },
    });
    if (!visible) throw new NotFoundException('Operator not found');

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

    return { employeeId, points, truncated: points.length === TRAIL_MAX_POINTS };
  }
}
