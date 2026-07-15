import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AuditService } from '../../audit/audit.service';
import {
  EmployeeCheckedInEvent,
  EmployeeCheckedOutEvent,
  BreakStartedEvent,
  BreakEndedEvent,
} from './impl';

// Business-event audit trail (AuditLogs.md §4 "Attendance Check-In/Out").
// Notification fan-out hooks in here later (3.6 EVENT_CATALOG.md).

@EventsHandler(EmployeeCheckedInEvent)
export class CheckedInAuditHandler
  implements IEventHandler<EmployeeCheckedInEvent>
{
  constructor(private readonly auditService: AuditService) {}

  async handle(event: EmployeeCheckedInEvent): Promise<void> {
    await this.auditService.log({
      tenantId: event.tenantId,
      module: 'ATTENDANCE',
      entityName: 'attendance_session',
      entityId: event.sessionId,
      action: 'ATTENDANCE_CHECK_IN',
      newValue: { employeeId: event.employeeId, punchIn: event.punchIn },
    });
  }
}

@EventsHandler(EmployeeCheckedOutEvent)
export class CheckedOutAuditHandler
  implements IEventHandler<EmployeeCheckedOutEvent>
{
  constructor(private readonly auditService: AuditService) {}

  async handle(event: EmployeeCheckedOutEvent): Promise<void> {
    await this.auditService.log({
      tenantId: event.tenantId,
      module: 'ATTENDANCE',
      entityName: 'attendance_session',
      entityId: event.sessionId,
      action: 'ATTENDANCE_CHECK_OUT',
      newValue: { employeeId: event.employeeId, punchOut: event.punchOut },
    });
  }
}

@EventsHandler(BreakStartedEvent)
export class BreakStartedAuditHandler
  implements IEventHandler<BreakStartedEvent>
{
  constructor(private readonly auditService: AuditService) {}

  async handle(event: BreakStartedEvent): Promise<void> {
    await this.auditService.log({
      tenantId: event.tenantId,
      module: 'ATTENDANCE',
      entityName: 'attendance_break',
      entityId: event.breakId,
      action: 'BREAK_STARTED',
      newValue: { employeeId: event.employeeId, sessionId: event.sessionId },
    });
  }
}

@EventsHandler(BreakEndedEvent)
export class BreakEndedAuditHandler implements IEventHandler<BreakEndedEvent> {
  constructor(private readonly auditService: AuditService) {}

  async handle(event: BreakEndedEvent): Promise<void> {
    await this.auditService.log({
      tenantId: event.tenantId,
      module: 'ATTENDANCE',
      entityName: 'attendance_break',
      entityId: event.breakId,
      action: 'BREAK_ENDED',
      newValue: {
        employeeId: event.employeeId,
        sessionId: event.sessionId,
        durationMinutes: event.durationMinutes,
      },
    });
  }
}

export const AttendanceEventHandlers = [
  CheckedInAuditHandler,
  CheckedOutAuditHandler,
  BreakStartedAuditHandler,
  BreakEndedAuditHandler,
];
