import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { SessionState } from '../attendance/domain/session-state';
import { creditWorkedMinutes } from '../attendance/domain/work-minutes';

/**
 * Midnight auto-checkout (PERFORMANCE_AUDIT: sessions left open forever
 * inflate "currently working" counts and break day totals).
 *
 * Every night at 00:05 server time, sessions still open from a previous day
 * are force-closed at 23:59:59 of their punch-in day for tenants whose
 * AttendancePolicy has autoCheckout enabled. Open breaks are ended at the
 * same instant, worked minutes are credited, and an APPROVED
 * AttendanceCorrection row records the system action for audit.
 */
@Injectable()
export class AttendanceSchedulerService {
  private readonly logger = new Logger(AttendanceSchedulerService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
  ) {}

  @Cron('5 0 * * *', { name: 'attendance-auto-checkout' })
  async autoCheckoutOpenSessions(): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const openSessions = await this.prisma.attendanceSession.findMany({
      where: { punchOut: null, punchIn: { lt: todayStart } },
      select: {
        id: true,
        tenantId: true,
        attendanceId: true,
        employeeId: true,
        punchIn: true,
      },
      // Uses attendance_sessions_tenantId_punchOut_idx; bounded batch so a
      // pathological backlog can't hold a connection for minutes
      take: 1000,
    });
    if (openSessions.length === 0) return;

    const tenantIds = [...new Set(openSessions.map((s) => s.tenantId))];
    const policies = await this.prisma.attendancePolicy.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { tenantId: true, autoCheckout: true },
    });
    const autoCheckoutByTenant = new Map(
      policies.map((p) => [p.tenantId, p.autoCheckout]),
    );

    let closed = 0;
    let skipped = 0;
    let failed = 0;

    for (const session of openSessions) {
      // Default to auto-checkout when no policy row exists (schema default)
      if (autoCheckoutByTenant.get(session.tenantId) === false) {
        skipped++;
        continue;
      }

      const punchOut = new Date(session.punchIn);
      punchOut.setHours(23, 59, 59, 0);

      try {
        // One transaction per session: a single bad row must not roll back
        // the whole nightly run
        await this.prisma.$transaction(async (tx) => {
          const openBreak = await tx.attendanceBreak.findFirst({
            where: { attendanceSessionId: session.id, endTime: null },
          });
          if (openBreak) {
            await tx.attendanceBreak.update({
              where: { id: openBreak.id },
              data: {
                endTime: punchOut,
                durationMinutes: Math.max(
                  0,
                  Math.round(
                    (punchOut.getTime() - openBreak.startTime.getTime()) /
                      60000,
                  ),
                ),
              },
            });
          }

          await tx.attendanceSession.update({
            where: { id: session.id },
            data: {
              punchOut,
              sessionStatus: SessionState.CHECKED_OUT,
            },
          });

          await creditWorkedMinutes(tx, session, punchOut);

          await tx.attendanceCorrection.create({
            data: {
              tenantId: session.tenantId,
              attendanceId: session.attendanceId,
              employeeId: session.employeeId,
              correctionType: 'AUTO_CHECKOUT',
              requestedValue: punchOut.toISOString(),
              reason: 'System auto-checkout: session left open past midnight',
              workflowStatus: 'APPROVED',
            },
          });
        });
        closed++;
      } catch (err) {
        failed++;
        this.logger.error(
          `Auto-checkout failed for session ${session.id} (tenant ${session.tenantId})`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    this.logger.log(
      `Auto-checkout run: ${closed} closed, ${skipped} skipped (policy), ${failed} failed`,
    );
  }
}
