import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { OfflinePunchItemDto, SyncPunchesDto } from './dto/sync-punches.dto';
import {
  SessionState,
  resolveState,
  canTransition,
} from './domain/session-state';
import { AuditService } from '../audit/audit.service';

export interface SyncItemResult {
  readonly clientRef: string;
  readonly status: 'APPLIED' | 'DUPLICATE' | 'FAILED';
  readonly error?: string;
}

/**
 * Offline punch ingestion (3.1 OFFLINE_SYNC.md §6-§9).
 *
 * Items are processed in capture order, honoring the original timestamps.
 * Idempotency: an item whose device signature already exists on a session,
 * or that lands within a minute of an existing punch, reports DUPLICATE —
 * retried uploads never double-punch (§9 conflict resolution: server-record
 * wins for exact duplicates).
 */
@Injectable()
export class OfflineSyncService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly auditService: AuditService,
  ) {}

  async syncPunches(
    user: { userId: string; tenantId: string },
    dto: SyncPunchesDto,
  ): Promise<{ results: SyncItemResult[] }> {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
    });
    if (!employee) throw new UnauthorizedException('Not an employee');

    // Device trust validated once for the batch (§8 local+server validation)
    const deviceIds = [...new Set(dto.punches.map((p) => p.deviceId))];
    const devices = await this.prisma.employeeDevice.findMany({
      where: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        deviceId: { in: deviceIds },
      },
    });
    const trusted = new Set(
      devices.filter((d) => d.isTrusted).map((d) => d.deviceId),
    );

    // Capture order (§7 priority: chronological within the batch)
    const ordered = [...dto.punches].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );

    const results: SyncItemResult[] = [];
    for (const item of ordered) {
      if (!trusted.has(item.deviceId)) {
        results.push({
          clientRef: item.clientRef,
          status: 'FAILED',
          error: 'Untrusted device',
        });
        continue;
      }
      try {
        results.push(await this.applyPunch(employee, item));
      } catch (error) {
        results.push({
          clientRef: item.clientRef,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Sync failed',
        });
      }
    }

    void this.auditService.log({
      tenantId: employee.tenantId,
      actorId: user.userId,
      module: 'ATTENDANCE',
      entityName: 'attendance_sync',
      entityId: employee.id,
      action: 'OFFLINE_SYNC',
      newValue: {
        received: dto.punches.length,
        applied: results.filter((r) => r.status === 'APPLIED').length,
        duplicates: results.filter((r) => r.status === 'DUPLICATE').length,
        failed: results.filter((r) => r.status === 'FAILED').length,
      },
    });

    return { results };
  }

  private async applyPunch(
    employee: { id: string; tenantId: string },
    item: OfflinePunchItemDto,
  ): Promise<SyncItemResult> {
    const punchAt = new Date(item.timestamp);

    return this.prisma.$transaction(async (tx) => {
      // Idempotency: exact retransmission (same signature) or a punch within
      // one minute of an existing one on either side of a session
      const windowStart = new Date(punchAt.getTime() - 60_000);
      const windowEnd = new Date(punchAt.getTime() + 60_000);
      const nearDuplicate = await tx.attendanceSession.findFirst({
        where: {
          employeeId: employee.id,
          OR: [
            { deviceSignature: item.signature },
            { punchIn: { gte: windowStart, lte: windowEnd } },
            { punchOut: { gte: windowStart, lte: windowEnd } },
          ],
        },
        select: { id: true },
      });
      if (nearDuplicate) {
        return { clientRef: item.clientRef, status: 'DUPLICATE' as const };
      }

      const day = new Date(punchAt);
      day.setHours(0, 0, 0, 0);

      let attendance = await tx.attendance.findFirst({
        where: { employeeId: employee.id, attendanceDate: day },
      });
      if (!attendance) {
        attendance = await tx.attendance.create({
          data: {
            tenantId: employee.tenantId,
            employeeId: employee.id,
            attendanceDate: day,
            status: 'PRESENT',
          },
        });
      }

      const openSession = await tx.attendanceSession.findFirst({
        where: { attendanceId: attendance.id, punchOut: null },
      });

      if (
        openSession &&
        openSession.punchIn < punchAt &&
        canTransition(
          resolveState(openSession.sessionStatus),
          SessionState.CHECKED_OUT,
        )
      ) {
        await tx.attendanceSession.update({
          where: { id: openSession.id },
          data: {
            punchOut: punchAt,
            checkOutLatitude: item.latitude,
            checkOutLongitude: item.longitude,
            punchOutDevice: item.deviceId,
            sessionStatus: SessionState.CHECKED_OUT,
          },
        });
        return { clientRef: item.clientRef, status: 'APPLIED' as const };
      }

      await tx.attendanceSession.create({
        data: {
          tenantId: employee.tenantId,
          attendanceId: attendance.id,
          employeeId: employee.id,
          punchIn: punchAt,
          checkInLatitude: item.latitude,
          checkInLongitude: item.longitude,
          punchInDevice: item.deviceId,
          deviceSignature: item.signature,
          attendanceMethod: 'GPS',
          sessionStatus: SessionState.CHECKED_IN,
        },
      });
      return { clientRef: item.clientRef, status: 'APPLIED' as const };
    });
  }
}
