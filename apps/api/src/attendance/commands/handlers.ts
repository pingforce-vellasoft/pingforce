import {
  BadRequestException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ExtendedPrismaClient } from '../../prisma/prisma.module';
import { PunchCommand } from './impl';
import {
  EmployeeCheckedInEvent,
  EmployeeCheckedOutEvent,
} from '../events/impl';
import {
  SessionState,
  assertTransition,
  resolveState,
} from '../domain/session-state';
import { creditWorkedMinutes } from '../domain/work-minutes';
import { GeofenceCacheService } from '../geofence-cache.service';

/**
 * Check-in / check-out (STATE_MACHINE.md §3): the punch decides direction
 * from the presence of an open session, drives the sessionStatus state
 * machine, and publishes domain events for downstream modules.
 */
@CommandHandler(PunchCommand)
export class PunchHandler implements ICommandHandler<PunchCommand> {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly eventBus: EventBus,
    private readonly geofenceCache: GeofenceCacheService,
  ) {}

  async execute({ user, dto }: PunchCommand) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
    });
    if (!employee) throw new UnauthorizedException('Not an employee');

    // Device trust (VALIDATING_* pipeline, STATE_MACHINE.md §5).
    // Scoped to the caller's tenant: deviceId is client-supplied, so resolving
    // it globally made the trust decision from a cross-tenant lookup.
    const device = await this.prisma.employeeDevice.findUnique({
      where: {
        tenantId_deviceId: {
          tenantId: employee.tenantId,
          deviceId: dto.deviceId,
        },
      },
    });
    // An employee who never completed onboarding binding is a different case
    // from one punching off a foreign handset: the first is sent to the binding
    // step, the second to the admin-approved change-request queue. Collapsing
    // both into UNTRUSTED_DEVICE told the client to re-register, which is the
    // self-service rebind that device binding exists to prevent.
    if (!employee.deviceBoundAt) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        errorCode: 'DEVICE-007',
        message: 'No device is bound to this account',
      });
    }
    if (
      !device ||
      !device.isTrusted ||
      device.revokedAt ||
      !device.publicKey ||
      device.employeeId !== employee.id
    ) {
      // `errorCode` is the contract the mobile client keys on. The
      // human-readable message is for display only — matching on it would break
      // the moment the wording changes or an exception filter reshapes the
      // body.
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        errorCode: 'UNTRUSTED_DEVICE',
        message: 'Untrusted device',
      });
    }

    // Geofence validation — scoped to the geofences this employee is actually
    // assigned to, not every geofence in the tenant. Redis-cached per employee
    // + in-process haversine, so no DB round-trip on the punch hot path
    // (SCALABILITY_AUDIT).
    const geofenceCheck = await this.geofenceCache.checkAssigned(
      employee.tenantId,
      employee.id,
      dto.latitude,
      dto.longitude,
    );
    if (geofenceCheck.status === 'NO_ASSIGNMENT') {
      // Distinct from OUTSIDE: standing somewhere else cannot fix this, only an
      // admin assigning a work location can. The mobile client keys on
      // `errorCode` to show the "contact your administrator" path instead of
      // the "move closer" one.
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        errorCode: 'GEOFENCE-001',
        message:
          'No work location is assigned to your account. Contact your administrator.',
      });
    }
    if (geofenceCheck.status === 'OUTSIDE') {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        errorCode: 'GEOFENCE-005',
        message: 'You are outside the authorized geofence area.',
      });
    }

    // Debounce + attendance/session writes are transactional so a double-tap
    // can never create two open sessions (state machine principle: one active
    // session per employee).
    const result = await this.prisma.$transaction(async (tx) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let attendance = await tx.attendance.findFirst({
        where: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          attendanceDate: today,
          deletedAt: null,
        },
      });
      if (!attendance) {
        attendance = await tx.attendance.create({
          data: {
            tenantId: employee.tenantId,
            employeeId: employee.id,
            attendanceDate: today,
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

      if (openSession) {
        // CHECKING_OUT → CHECKED_OUT
        assertTransition(
          resolveState(openSession.sessionStatus),
          SessionState.CHECKED_OUT,
        );

        const punchOut = new Date();
        const session = await tx.attendanceSession.update({
          where: { id: openSession.id },
          data: {
            punchOut,
            checkOutLatitude: dto.latitude,
            checkOutLongitude: dto.longitude,
            punchOutDevice: dto.deviceId,
            sessionStatus: SessionState.CHECKED_OUT,
          },
        });
        await creditWorkedMinutes(tx, openSession, punchOut);
        return { session, direction: 'OUT' as const };
      }

      // Debounce duplicate check-ins only — a check-out (openSession above)
      // must never be blocked by a recent punch-in. Guards double-tap that
      // would otherwise open two sessions.
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentSession = await tx.attendanceSession.findFirst({
        where: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          punchIn: { gte: fifteenMinsAgo },
          deletedAt: null,
        },
      });
      if (recentSession) {
        throw new BadRequestException(
          'You have already punched recently. Please wait 15 minutes.',
        );
      }

      // CHECKING_IN → CHECKED_IN
      const session = await tx.attendanceSession.create({
        data: {
          tenantId: employee.tenantId,
          attendanceId: attendance.id,
          employeeId: employee.id,
          punchIn: new Date(),
          checkInLatitude: dto.latitude,
          checkInLongitude: dto.longitude,
          punchInDevice: dto.deviceId,
          deviceSignature: dto.signature,
          attendanceMethod: 'BIOMETRIC',
          sessionStatus: SessionState.CHECKED_IN,
        },
      });
      return { session, direction: 'IN' as const };
    });

    if (result.direction === 'IN') {
      this.eventBus.publish(
        new EmployeeCheckedInEvent(
          employee.tenantId,
          employee.id,
          result.session.id,
          result.session.punchIn,
        ),
      );
    } else {
      this.eventBus.publish(
        new EmployeeCheckedOutEvent(
          employee.tenantId,
          employee.id,
          result.session.id,
          result.session.punchOut!,
        ),
      );
    }

    return result.session;
  }
}

export const AttendanceCommandHandlers = [PunchHandler];
