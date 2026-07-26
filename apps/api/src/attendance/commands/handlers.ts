import {
  BadRequestException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ExtendedPrismaClient } from '../../prisma/prisma.module';
import { PunchCommand, StartBreakCommand, EndBreakCommand } from './impl';
import {
  EmployeeCheckedInEvent,
  EmployeeCheckedOutEvent,
  BreakStartedEvent,
  BreakEndedEvent,
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

    // Geofence validation — Redis-cached tenant geofences + in-process
    // haversine, no DB round-trip on the punch hot path (SCALABILITY_AUDIT)
    const insideGeofence = await this.geofenceCache.isInsideAny(
      employee.tenantId,
      dto.latitude,
      dto.longitude,
    );
    if (!insideGeofence) {
      throw new BadRequestException(
        'You are outside the authorized geofence area.',
      );
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

/** WORKING → ON_BREAK (STATE_MACHINE.md §4 ON_BREAK) */
@CommandHandler(StartBreakCommand)
export class StartBreakHandler implements ICommandHandler<StartBreakCommand> {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ user, breakType }: StartBreakCommand) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
    });
    if (!employee) throw new UnauthorizedException('Not an employee');

    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.findFirst({
        where: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          punchOut: null,
          deletedAt: null,
        },
      });
      if (!session) {
        throw new BadRequestException('No active attendance session');
      }

      assertTransition(
        resolveState(session.sessionStatus),
        SessionState.ON_BREAK,
      );

      const openBreak = await tx.attendanceBreak.findFirst({
        where: {
          tenantId: employee.tenantId,
          attendanceSessionId: session.id,
          endTime: null,
          deletedAt: null,
        },
      });
      if (openBreak) {
        // The transition above already established that the session is not
        // ON_BREAK, so an unclosed row here is orphaned state (a crash between
        // the break insert and the status update, or a direct DB edit). Close
        // it out rather than refusing forever: the employee would otherwise be
        // unable to take another break for the rest of the session.
        const endTime = new Date();
        await tx.attendanceBreak.update({
          where: { id: openBreak.id },
          data: {
            endTime,
            durationMinutes: Math.round(
              (endTime.getTime() - openBreak.startTime.getTime()) / 60000,
            ),
          },
        });
      }

      const breakRecord = await tx.attendanceBreak.create({
        data: {
          tenantId: employee.tenantId,
          attendanceSessionId: session.id,
          breakType,
          startTime: new Date(),
        },
      });

      await tx.attendanceSession.update({
        where: { id: session.id },
        data: { sessionStatus: SessionState.ON_BREAK },
      });

      return { session, breakRecord };
    });

    this.eventBus.publish(
      new BreakStartedEvent(
        employee.tenantId,
        employee.id,
        result.session.id,
        result.breakRecord.id,
      ),
    );

    return result.breakRecord;
  }
}

/** ON_BREAK → WORKING (STATE_MACHINE.md §4 "Resume Work") */
@CommandHandler(EndBreakCommand)
export class EndBreakHandler implements ICommandHandler<EndBreakCommand> {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ user }: EndBreakCommand) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
    });
    if (!employee) throw new UnauthorizedException('Not an employee');

    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.attendanceSession.findFirst({
        where: {
          tenantId: employee.tenantId,
          employeeId: employee.id,
          punchOut: null,
          deletedAt: null,
        },
      });
      if (!session) {
        throw new BadRequestException('No active attendance session');
      }

      assertTransition(
        resolveState(session.sessionStatus),
        SessionState.WORKING,
      );

      const openBreak = await tx.attendanceBreak.findFirst({
        where: {
          tenantId: employee.tenantId,
          attendanceSessionId: session.id,
          endTime: null,
          deletedAt: null,
        },
      });
      if (!openBreak) {
        // The transition check passed, so the session column says ON_BREAK
        // while no break row is open — orphaned state from a crash between the
        // two writes. Refusing here would pin the session in ON_BREAK for good
        // (check-out would be the only way out), so resynchronise the status
        // and report success with nothing to credit.
        await tx.attendanceSession.update({
          where: { id: session.id },
          data: { sessionStatus: SessionState.WORKING },
        });
        return { session, breakRecord: null, durationMinutes: 0 };
      }

      const endTime = new Date();
      const durationMinutes = Math.round(
        (endTime.getTime() - openBreak.startTime.getTime()) / 60000,
      );

      const breakRecord = await tx.attendanceBreak.update({
        where: { id: openBreak.id },
        data: { endTime, durationMinutes },
      });

      await tx.attendanceSession.update({
        where: { id: session.id },
        data: { sessionStatus: SessionState.WORKING },
      });

      return { session, breakRecord, durationMinutes };
    });

    // No event when there was no real break to end — the recovery path above
    // only resynchronised the session status, and downstream consumers must
    // not see a zero-length break that never happened.
    if (result.breakRecord) {
      this.eventBus.publish(
        new BreakEndedEvent(
          employee.tenantId,
          employee.id,
          result.session.id,
          result.breakRecord.id,
          result.durationMinutes,
        ),
      );
    }

    return result.breakRecord;
  }
}

export const AttendanceCommandHandlers = [
  PunchHandler,
  StartBreakHandler,
  EndBreakHandler,
];
