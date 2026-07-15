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
import { SessionState, assertTransition, resolveState } from '../domain/session-state';

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
  ) {}

  async execute({ user, dto }: PunchCommand) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: user.userId },
    });
    if (!employee) throw new UnauthorizedException('Not an employee');

    // Device trust (VALIDATING_* pipeline, STATE_MACHINE.md §5)
    const device = await this.prisma.employeeDevice.findUnique({
      where: { deviceId: dto.deviceId },
    });
    if (!device || !device.isTrusted || device.employeeId !== employee.id) {
      throw new UnauthorizedException('Untrusted device');
    }

    // Geofence validation (PostGIS)
    const geofences = await this.prisma.$queryRaw`
      SELECT id FROM geofences
      WHERE "tenantId" = ${employee.tenantId} AND active = true
      AND ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326),
        "radiusMeters"
      )
    `;
    if (!Array.isArray(geofences) || geofences.length === 0) {
      throw new BadRequestException(
        'You are outside the authorized geofence area.',
      );
    }

    // Debounce + attendance/session writes are transactional so a double-tap
    // can never create two open sessions (state machine principle: one active
    // session per employee).
    const result = await this.prisma.$transaction(async (tx) => {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentSession = await tx.attendanceSession.findFirst({
        where: { employeeId: employee.id, punchIn: { gte: fifteenMinsAgo } },
      });
      if (recentSession) {
        throw new BadRequestException(
          'You have already punched recently. Please wait 15 minutes.',
        );
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let attendance = await tx.attendance.findFirst({
        where: { employeeId: employee.id, attendanceDate: today },
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
        where: { attendanceId: attendance.id, punchOut: null },
      });

      if (openSession) {
        // CHECKING_OUT → CHECKED_OUT
        assertTransition(
          resolveState(openSession.sessionStatus),
          SessionState.CHECKED_OUT,
        );

        const session = await tx.attendanceSession.update({
          where: { id: openSession.id },
          data: {
            punchOut: new Date(),
            checkOutLatitude: dto.latitude,
            checkOutLongitude: dto.longitude,
            punchOutDevice: dto.deviceId,
            sessionStatus: SessionState.CHECKED_OUT,
          },
        });
        return { session, direction: 'OUT' as const };
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
        where: { employeeId: employee.id, punchOut: null },
      });
      if (!session) {
        throw new BadRequestException('No active attendance session');
      }

      assertTransition(
        resolveState(session.sessionStatus),
        SessionState.ON_BREAK,
      );

      const openBreak = await tx.attendanceBreak.findFirst({
        where: { attendanceSessionId: session.id, endTime: null },
      });
      if (openBreak) {
        throw new BadRequestException('A break is already in progress');
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
        where: { employeeId: employee.id, punchOut: null },
      });
      if (!session) {
        throw new BadRequestException('No active attendance session');
      }

      assertTransition(
        resolveState(session.sessionStatus),
        SessionState.WORKING,
      );

      const openBreak = await tx.attendanceBreak.findFirst({
        where: { attendanceSessionId: session.id, endTime: null },
      });
      if (!openBreak) {
        throw new BadRequestException('No break in progress');
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

    this.eventBus.publish(
      new BreakEndedEvent(
        employee.tenantId,
        employee.id,
        result.session.id,
        result.breakRecord.id,
        result.durationMinutes,
      ),
    );

    return result.breakRecord;
  }
}

export const AttendanceCommandHandlers = [
  PunchHandler,
  StartBreakHandler,
  EndBreakHandler,
];
