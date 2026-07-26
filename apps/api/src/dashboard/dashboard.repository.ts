import { Inject, Injectable } from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD REPOSITORY  (Controller → Service → Repository → Prisma)
// ─────────────────────────────────────────────────────────────────────────────
//
// Pure data access for the Home-screen aggregate. Every query is scoped to
// tenantId and (for personal data) the caller's employeeId. No business logic
// here — the service composes these into the summary DTO.

export interface AuthContext {
  readonly userId: string;
  readonly tenantId: string;
  readonly role: string;
}

@Injectable()
export class DashboardRepository {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
  ) {}

  /** The caller's employee record with the profile fields the header needs. */
  async findEmployeeByUser(ctx: AuthContext) {
    return this.prisma.employee.findFirst({
      where: { tenantId: ctx.tenantId, userId: ctx.userId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photograph: true,
        reportingManagerId: true,
        department: { select: { name: true } },
      },
    });
  }

  /** True if anyone reports to this employee (drives the manager team card). */
  async hasDirectReports(
    tenantId: string,
    employeeId: string,
  ): Promise<boolean> {
    const count = await this.prisma.employee.count({
      where: { tenantId, reportingManagerId: employeeId, deletedAt: null },
    });
    return count > 0;
  }

  /**
   * Today's attendance day-record for this employee, including its shift and
   * the open/closed sessions for the day. Returns null on a day off.
   */
  async findTodayAttendance(
    tenantId: string,
    employeeId: string,
    dayStart: Date,
    dayEnd: Date,
  ) {
    return this.prisma.attendance.findFirst({
      where: {
        tenantId,
        employeeId,
        deletedAt: null,
        attendanceDate: { gte: dayStart, lte: dayEnd },
      },
      select: {
        id: true,
        status: true,
        shift: {
          select: {
            name: true,
            startTime: true,
            endTime: true,
            gracePeriod: true,
          },
        },
        sessions: {
          where: { deletedAt: null },
          orderBy: { punchIn: 'asc' },
          select: {
            id: true,
            punchIn: true,
            punchOut: true,
            sessionStatus: true,
            // startTime/endTime drive the "on break" status and the live break
            // timer; durationMinutes feeds the break/worked split. Selecting
            // only `id` made every one of those unavailable to the hero card.
            breaks: {
              where: { deletedAt: null },
              orderBy: { startTime: 'asc' },
              select: {
                id: true,
                startTime: true,
                endTime: true,
                durationMinutes: true,
                paidBreak: true,
              },
            },
          },
        },
      },
    });
  }

  /** Open faults assigned to this user, split by SLA breach. */
  async faultCounts(tenantId: string, userId: string, now: Date) {
    const [open, overdue] = await Promise.all([
      this.prisma.fault.count({
        where: {
          tenantId,
          deletedAt: null,
          assignedToId: userId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.fault.count({
        where: {
          tenantId,
          deletedAt: null,
          assignedToId: userId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          slaDeadline: { lt: now },
        },
      }),
    ]);
    return { open, overdue };
  }

  /** Visits planned for this employee today, split by completion. */
  async visitCounts(
    tenantId: string,
    employeeId: string,
    dayStart: Date,
    dayEnd: Date,
  ) {
    const [total, completed] = await Promise.all([
      this.prisma.visit.count({
        where: {
          tenantId,
          deletedAt: null,
          employeeId,
          plannedStartAt: { gte: dayStart, lte: dayEnd },
        },
      }),
      this.prisma.visit.count({
        where: {
          tenantId,
          deletedAt: null,
          employeeId,
          plannedStartAt: { gte: dayStart, lte: dayEnd },
          status: { in: ['COMPLETED', 'CLOSED'] },
        },
      }),
    ]);
    return { total, completed, remaining: total - completed };
  }
}
