import {
  BadRequestException,
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { OfflinePunchItemDto, SyncPunchesDto } from './dto/sync-punches.dto';
import {
  SessionState,
  resolveState,
  canTransition,
} from './domain/session-state';
import { AuditService } from '../audit/audit.service';
import { PunchSignatureService } from './punch-signature.service';
import { GeofenceCacheService } from './geofence-cache.service';
import { creditWorkedMinutes } from './domain/work-minutes';

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
    private readonly punchSignature: PunchSignatureService,
    private readonly geofenceCache: GeofenceCacheService,
  ) {}

  async syncPunches(
    user: { userId: string; tenantId: string },
    dto: SyncPunchesDto,
  ): Promise<{ results: SyncItemResult[] }> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId: user.userId,
        tenantId: user.tenantId,
        deletedAt: null,
      },
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
    const trusted = new Map(
      devices
        .filter((d) => d.isTrusted && !d.revokedAt)
        .map((d) => [d.deviceId, d.publicKey] as const),
    );

    const policy = await this.prisma.attendancePolicy.findFirst({
      where: { tenantId: employee.tenantId, deletedAt: null },
    });
    const gpsRequired = policy?.gpsRequired ?? true;
    if (policy?.allowOfflineCheckIn === false) {
      throw new BadRequestException(
        'Offline attendance is disabled for this tenant.',
      );
    }

    // Capture order (§7 priority: chronological within the batch)
    const ordered = [...dto.punches].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );

    const results: SyncItemResult[] = [];
    for (const item of ordered) {
      const publicKey = trusted.get(item.deviceId);
      if (!publicKey) {
        results.push({
          clientRef: item.clientRef,
          status: 'FAILED',
          error: 'Untrusted device',
        });
        continue;
      }
      try {
        this.punchSignature.verify(publicKey, {
          ...item,
          clientRef: item.clientRef,
        });
        if (new Date(item.timestamp).getTime() > Date.now() + 60_000) {
          throw new BadRequestException(
            'Punch timestamp cannot be in the future.',
          );
        }
        if (
          item.isMockLocation === true &&
          (policy?.mockLocationPolicy ?? 'BLOCK') === 'BLOCK'
        ) {
          throw new BadRequestException('Simulated location detected.');
        }
        if (gpsRequired && item.accuracy === undefined) {
          throw new BadRequestException('GPS accuracy is required.');
        }
        if (
          gpsRequired &&
          item.accuracy !== undefined &&
          item.accuracy > (policy?.gpsAccuracyThreshold ?? 50) &&
          !(policy?.allowLowAccuracy ?? false)
        ) {
          throw new BadRequestException(
            'GPS accuracy is outside the allowed threshold.',
          );
        }
        if (policy?.biometricRequired && item.biometricVerified !== true) {
          throw new BadRequestException('Biometric verification is required.');
        }
        if (policy?.geofenceRequired ?? true) {
          const fence = await this.geofenceCache.checkAssigned(
            employee.tenantId,
            employee.id,
            item.latitude,
            item.longitude,
          );
          if (
            fence.status !== 'INSIDE' &&
            (policy?.outsideGeofencePolicy ?? 'BLOCK') === 'BLOCK'
          ) {
            throw new BadRequestException(
              fence.status === 'NO_ASSIGNMENT'
                ? 'No work location is assigned to this employee.'
                : 'Punch is outside the authorized geofence.',
            );
          }
        }
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
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${employee.tenantId}),
          hashtext(${employee.id})
        )
      `;

      // Idempotency: exact retransmission (same signature) or a punch within
      // one minute of an existing one on either side of a session
      const windowStart = new Date(punchAt.getTime() - 60_000);
      const windowEnd = new Date(punchAt.getTime() + 60_000);
      const nearDuplicate = await tx.attendanceSession.findFirst({
        where: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          deletedAt: null,
          OR: [
            { deviceSignature: item.signature },
            { checkOutDeviceSignature: item.signature },
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
        where: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          attendanceDate: day,
          deletedAt: null,
        },
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
        where: {
          tenantId: employee.tenantId,
          attendanceId: attendance.id,
          punchOut: null,
          deletedAt: null,
        },
      });

      if (
        openSession &&
        openSession.punchIn < punchAt &&
        canTransition(
          resolveState(openSession.sessionStatus),
          SessionState.CHECKED_OUT,
        )
      ) {
        const updated = await tx.attendanceSession.updateMany({
          where: { id: openSession.id, punchOut: null, deletedAt: null },
          data: {
            punchOut: punchAt,
            checkOutLatitude: item.latitude,
            checkOutLongitude: item.longitude,
            punchOutDevice: item.deviceId,
            checkOutDeviceSignature: item.signature,
            sessionStatus: SessionState.CHECKED_OUT,
          },
        });
        if (updated.count !== 1) {
          throw new Error('Attendance session changed while syncing.');
        }
        await creditWorkedMinutes(tx, openSession, punchAt);
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
          gpsAccuracy: item.accuracy,
          isSpoofed: item.isMockLocation ?? false,
          attendanceMethod: 'GPS',
          sessionStatus: SessionState.CHECKED_IN,
        },
      });
      return { clientRef: item.clientRef, status: 'APPLIED' as const };
    });
  }
}
