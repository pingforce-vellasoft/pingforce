import {
  Inject,
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { RegisterDeviceDto, CreateGeofenceDto } from './dto/attendance.dto';
import { RbacService } from '../rbac/rbac.service';
import { creditWorkedMinutes } from './domain/work-minutes';
import { resolveState, SessionState } from './domain/session-state';
import { GeofenceCacheService } from './geofence-cache.service';
import * as crypto from 'crypto';

@Injectable()
export class AttendanceService {
  constructor(
    @Inject('IPrismaService') private prisma: ExtendedPrismaClient,
    private readonly rbacService: RbacService,
    private readonly geofenceCache: GeofenceCacheService,
  ) {}

  async getDevices(user: any, skip = 0, take = 50) {
    return this.prisma.employeeDevice.findMany({
      where: { tenantId: user.tenantId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            // Never include the full user record — it carries passwordHash
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(take, 200),
    });
  }

  async registerDevice(user: any, dto: RegisterDeviceDto) {
    // Only employees can register a device
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
    });
    if (!employee) throw new UnauthorizedException('User is not an employee');

    // Revoke-then-register atomically so the 1-device policy can't be
    // violated by concurrent registrations (PRISMA_GUIDELINES.md §10).
    // Both writes are tenant-scoped: deviceId comes from the client, so an
    // unscoped revoke could clear rows belonging to another tenant.
    const [, device] = await this.prisma.$transaction([
      this.prisma.employeeDevice.updateMany({
        where: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          isTrusted: true,
        },
        data: { isTrusted: false, revokedAt: new Date() },
      }),
      // Upsert, not create: the mobile client re-registers on first punch after
      // a reinstall, and with per-tenant uniqueness that same deviceId already
      // exists. A plain create raised P2002 and the retry never recovered.
      this.prisma.employeeDevice.upsert({
        where: {
          tenantId_deviceId: {
            tenantId: employee.tenantId,
            deviceId: dto.deviceId,
          },
        },
        create: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          deviceId: dto.deviceId,
          publicKey: dto.publicKey,
          isTrusted: true,
          createdBy: user.userId,
        },
        update: {
          employeeId: employee.id,
          publicKey: dto.publicKey,
          isTrusted: true,
          revokedAt: null,
          updatedBy: user.userId,
        },
      }),
    ]);

    return device;
  }

  async revokeDevice(admin: any, employeeId: string, deviceId: string) {
    // Basic check for admin (assume proper RBAC guard in real app)
    if (
      admin.roleCode !== 'SUPER_ADMIN' &&
      admin.roleCode !== 'ADMIN_MANAGER'
    ) {
      throw new UnauthorizedException('Only admins can revoke devices');
    }

    return this.prisma.employeeDevice.updateMany({
      where: { tenantId: admin.tenantId, employeeId, deviceId },
      data: { isTrusted: false, revokedAt: new Date() },
    });
  }

  async manualCheckout(
    admin: any,
    dto: import('./dto/manual-checkout.dto').ManualCheckoutDto,
  ) {
    if (
      admin.roleCode !== 'SUPER_ADMIN' &&
      admin.roleCode !== 'ADMIN_MANAGER'
    ) {
      throw new UnauthorizedException(
        'Only admins can perform manual checkouts',
      );
    }

    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: dto.attendanceSessionId },
    });

    if (!session || session.tenantId !== admin.tenantId) {
      throw new BadRequestException('Invalid session');
    }

    if (session.punchOut) {
      throw new BadRequestException('Session already has a checkout time');
    }

    const punchOutTime = new Date(dto.checkoutTime);

    // Session close, work-minute credit, and audit record must land together
    return this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.attendanceSession.update({
        where: { id: session.id },
        data: {
          punchOut: punchOutTime,
          attendanceMethod: 'MANUAL', // We could use an enum, or just track in corrections
        },
      });

      await creditWorkedMinutes(tx, session, punchOutTime);

      await tx.attendanceCorrection.create({
        data: {
          tenantId: admin.tenantId,
          attendanceId: session.attendanceId,
          employeeId: session.employeeId,
          correctionType: 'MANUAL_CHECKOUT',
          requestedValue: punchOutTime.toISOString(),
          reason: dto.reason,
          workflowStatus: 'APPROVED',
          approvedBy: admin.userId,
          approvedAt: new Date(),
        },
      });

      return updatedSession;
    });
  }

  /**
   * Today's attendance snapshot for the signed-in employee — the mobile
   * attendance screen calls this on every open so a returning user resumes
   * their open session instead of being shown a fresh check-in page.
   *
   * Returns the open session (if any) with its break state, today's totals,
   * and current leave balances.
   */
  async getToday(user: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
      select: { id: true, tenantId: true },
    });
    if (!employee) throw new UnauthorizedException('User is not an employee');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Half-open day range rather than an exact `attendanceDate` equality match.
    // Writers normalise to midnight in the server's local tz, but offline-sync
    // derives the day from a client-supplied `punchAt` and DST shifts move the
    // boundary — an exact match then returns nothing and the mobile screen
    // reports "not checked in" for an employee with an open session.
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        attendanceDate: { gte: today, lt: tomorrow },
        deletedAt: null,
      },
      orderBy: { attendanceDate: 'desc' },
      include: {
        sessions: {
          where: { deletedAt: null },
          orderBy: { punchIn: 'asc' },
          include: {
            breaks: {
              where: { deletedAt: null },
              orderBy: { startTime: 'asc' },
            },
          },
        },
      },
    });

    const sessions = attendance?.sessions ?? [];
    const openSession = sessions.find((s) => s.punchOut === null) ?? null;
    const allBreaks = sessions.flatMap((s) => s.breaks);
    const openBreak =
      openSession?.breaks.find((b) => b.endTime === null) ?? null;

    // `sessionStatus` is authoritative for break state, not the presence of an
    // unclosed break row. StartBreak/EndBreak gate on the column via
    // assertTransition, so reporting isOnBreak from a stray open row would let
    // the client show "On Break" for a WORKING session and then call endBreak
    // into a rejected transition. The row only supplies the start time.
    const openSessionState = openSession
      ? resolveState(openSession.sessionStatus)
      : null;
    const isOnBreak = openSessionState === SessionState.ON_BREAK;

    const closedPunchOuts = sessions
      .map((s) => s.punchOut)
      .filter((p): p is Date => p !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const breakMinutes = allBreaks.reduce(
      (sum, b) => sum + (b.durationMinutes ?? 0),
      0,
    );

    const leaveBalances = await this.prisma.leaveBalance.findMany({
      where: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        year: today.getFullYear(),
        deletedAt: null,
      },
      select: {
        totalDays: true,
        usedDays: true,
        availableDays: true,
        leaveType: { select: { id: true, name: true, code: true } },
      },
    });

    return {
      date: today.toISOString(),
      status: attendance?.status ?? null,
      // Open session drives the mobile UI's "resume" path; null means the
      // employee has not checked in today (or already checked out).
      activeSession: openSession
        ? {
            id: openSession.id,
            punchIn: openSession.punchIn,
            sessionStatus: openSessionState,
            isOnBreak,
            currentBreakStartedAt: isOnBreak
              ? (openBreak?.startTime ?? null)
              : null,
            breaksTaken: openSession.breaks.length,
            checkInLatitude: openSession.checkInLatitude,
            checkInLongitude: openSession.checkInLongitude,
          }
        : null,
      sessions: sessions.map((s) => ({
        id: s.id,
        punchIn: s.punchIn,
        punchOut: s.punchOut,
        sessionStatus: resolveState(s.sessionStatus),
        breaks: s.breaks.map((b) => ({
          id: b.id,
          breakType: b.breakType,
          paidBreak: b.paidBreak,
          startTime: b.startTime,
          endTime: b.endTime,
          durationMinutes: b.durationMinutes,
        })),
      })),
      totals: {
        // Credited on check-out only, so an open session contributes 0 here.
        workedMinutes: attendance?.totalWorkMinutes ?? 0,
        overtimeMinutes: attendance?.overtimeMinutes ?? 0,
        breaksTaken: allBreaks.length,
        breakMinutes,
        firstPunchIn: sessions.length > 0 ? sessions[0].punchIn : null,
        // Last *closed* session's punch-out. Reading the final element blindly
        // yields null whenever the day ends with an open session, hiding an
        // earlier real check-out.
        lastPunchOut:
          closedPunchOuts.length > 0
            ? closedPunchOuts[closedPunchOuts.length - 1]
            : null,
      },
      leaveBalances: leaveBalances.map((b) => ({
        leaveTypeId: b.leaveType.id,
        leaveTypeName: b.leaveType.name,
        leaveTypeCode: b.leaveType.code,
        totalDays: b.totalDays,
        usedDays: b.usedDays,
        availableDays: b.availableDays,
      })),
    };
  }

  async getLogs(
    user: any,
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
    sortDir?: string,
  ) {
    // `page`/`limit` arrive as raw query strings coerced with Number(), so a
    // missing/garbage value yields NaN and `?page=0` yields a negative skip —
    // both reach Prisma as invalid arguments. Clamp here (the service owns the
    // invariant) and cap the page size like every other list endpoint, so
    // `?limit=999999` cannot pull every session with its full include tree.
    const safeLimit = Math.min(
      Math.max(Number.isFinite(limit) ? Math.trunc(limit) : 10, 1),
      200,
    );
    const safePage = Math.max(Number.isFinite(page) ? Math.trunc(page) : 1, 1);
    const skip = (safePage - 1) * safeLimit;

    // Data scope (DataScope.md §9 "Attendance"): employees see own logs,
    // managers their team, HR/tenant admins the whole tenant. Broadest of
    // READ/READ_OWN wins (admins hold both with ALL scope).
    const scope = await this.rbacService.resolveScopeIds(
      user.tenantId,
      user.userId,
      'ATTENDANCE',
      ['READ', 'READ_OWN'],
    );
    const scopeWhere = this.rbacService.employeeScopeWhere(scope);
    if (scopeWhere === null) {
      return { data: [], total: 0, page, limit };
    }

    const where: any = { tenantId: user.tenantId, ...scopeWhere };

    if (search) {
      where.employee = {
        user: {
          profile: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    let orderBy: any = { punchIn: 'desc' };

    if (sortBy) {
      const direction = sortDir === 'asc' ? 'asc' : 'desc';
      if (sortBy === 'checkIn') {
        orderBy = { punchIn: direction };
      } else if (sortBy === 'checkOut') {
        orderBy = { punchOut: direction };
      } else if (sortBy === 'employee') {
        // Sorting by nested fields in Prisma requires specific syntax
        orderBy = {
          employee: {
            user: {
              profile: {
                firstName: direction,
              },
            },
          },
        };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        include: {
          employee: {
            include: {
              user: { select: { profile: true } },
              department: true,
              team: true,
              company: true,
            },
          },
          attendance: true,
        },
        orderBy,
        skip,
        take: safeLimit,
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    const employeeIds = [
      ...new Set(data.map((log) => log.employeeId).filter(Boolean)),
    ];
    const metrics = await this.getEmployeeMetrics(user.tenantId, employeeIds);

    const mappedData = data.map((log) => ({
      ...log,
      employee: {
        ...log.employee,
        shortfallDays: metrics.get(log.employeeId)?.shortfallDays ?? 0,
        leaveBalance: metrics.get(log.employeeId)?.leaveBalance ?? 0,
      },
    }));

    // Echo the effective values, not the requested ones — a client that asked
    // for limit=999999 receives 200 rows and must be told the real page size
    // or its pager arithmetic breaks.
    return { data: mappedData, total, page: safePage, limit: safeLimit };
  }

  /**
   * Batched per-employee metrics for the logs grid (3 queries per page,
   * regardless of page size — no N+1):
   * - leaveBalance: sum of available days across leave types, current year
   * - shortfallDays: completed days this month where worked minutes fell
   *   short of the tenant policy's working hours
   */
  private async getEmployeeMetrics(
    tenantId: string,
    employeeIds: string[],
  ): Promise<Map<string, { shortfallDays: number; leaveBalance: number }>> {
    const metrics = new Map<
      string,
      { shortfallDays: number; leaveBalance: number }
    >();
    if (employeeIds.length === 0) return metrics;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const policy = await this.prisma.attendancePolicy.findFirst({
      where: { tenantId, deletedAt: null },
    });
    const requiredMinutes = (policy?.workingHours ?? 8) * 60;

    const [leaveBalances, shortDayRows] = await Promise.all([
      this.prisma.leaveBalance.groupBy({
        by: ['employeeId'],
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          year: now.getFullYear(),
        },
        _sum: { availableDays: true },
      }),
      this.prisma.attendance.groupBy({
        by: ['employeeId'],
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          attendanceDate: { gte: monthStart, lt: todayStart },
          totalWorkMinutes: { lt: requiredMinutes },
        },
        _count: { _all: true },
      }),
    ]);

    for (const id of employeeIds) {
      metrics.set(id, { shortfallDays: 0, leaveBalance: 0 });
    }
    for (const row of leaveBalances) {
      const entry = metrics.get(row.employeeId);
      if (entry) entry.leaveBalance = row._sum.availableDays ?? 0;
    }
    for (const row of shortDayRows) {
      const entry = metrics.get(row.employeeId);
      if (entry) entry.shortfallDays = row._count._all;
    }

    return metrics;
  }

  async createGeofence(user: any, dto: CreateGeofenceDto) {
    if (user.roleCode !== 'SUPER_ADMIN' && user.roleCode !== 'ADMIN_MANAGER') {
      throw new UnauthorizedException('Only admins can create geofences');
    }

    // Check for duplicate name
    const existingName = await this.prisma.geofence.findFirst({
      // Deleted geofences must not reserve their name forever.
      where: {
        tenantId: user.tenantId,
        name: dto.name,
        active: true,
        deletedAt: null,
      },
    });
    if (existingName) {
      throw new BadRequestException(
        'A geofence with this name already exists.',
      );
    }

    // Check for duplicate coordinates
    const existingCoords = await this.prisma.geofence.findFirst({
      where: {
        tenantId: user.tenantId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        active: true,
        deletedAt: null,
      },
    });
    if (existingCoords) {
      throw new BadRequestException(
        'A geofence with these exact coordinates already exists.',
      );
    }

    // Create record using standard Prisma, then update the PostGIS location using Raw SQL
    const geofence = await this.prisma.geofence.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters,
      },
    });

    await this.prisma.$executeRaw`
      UPDATE geofences
      SET location = ST_SetSRID(ST_MakePoint(${dto.longitude}::float, ${dto.latitude}::float), 4326)
      WHERE id = ${geofence.id}
    `;

    await this.geofenceCache.invalidate(user.tenantId);

    return geofence;
  }

  async getGeofences(user: any) {
    return this.prisma.geofence.findMany({
      where: { tenantId: user.tenantId, active: true, deletedAt: null },
    });
  }

  async deleteGeofence(user: any, id: string) {
    if (user.roleCode !== 'SUPER_ADMIN' && user.roleCode !== 'ADMIN_MANAGER') {
      throw new UnauthorizedException('Only admins can delete geofences');
    }
    const result = await this.prisma.geofence.updateMany({
      where: { id, tenantId: user.tenantId },
      data: { active: false }, // Soft delete
    });
    await this.geofenceCache.invalidate(user.tenantId);
    return result;
  }
}
