import { NotFoundException } from '@nestjs/common';
import { AttendanceTimelineService } from './attendance-timeline.service';

const USER = { tenantId: 't1', userId: 'admin-1' };
const at = (hhmm: string) => new Date(`2026-11-19T${hhmm}:00.000Z`);

function session(over: Record<string, unknown> = {}) {
  return {
    id: 's1',
    attendanceId: 'a1',
    employeeId: 'e1',
    punchIn: at('09:00'),
    punchOut: at('18:00'),
    checkInLatitude: 13.08,
    checkInLongitude: 80.27,
    checkOutLatitude: 13.09,
    checkOutLongitude: 80.28,
    gpsAccuracy: 12,
    attendanceMethod: 'GPS',
    isSpoofed: false,
    punchInDevice: 'dev-1',
    punchOutDevice: 'dev-1',
    employee: { id: 'e1', employeeCode: 'E1', firstName: 'Ana', lastName: 'D' },
    ...over,
  };
}

function makeService(scope: object = { kind: 'ALL' }) {
  const prisma = {
    attendanceSession: { findFirst: jest.fn().mockResolvedValue(session()) },
    attendanceBreak: { findMany: jest.fn().mockResolvedValue([]) },
    trackingGap: { findMany: jest.fn().mockResolvedValue([]) },
    attendanceCorrection: { findMany: jest.fn().mockResolvedValue([]) },
    employeeLocation: {
      aggregate: jest.fn().mockResolvedValue({
        _count: { _all: 0 },
        _min: { capturedAt: null },
        _max: { capturedAt: null },
      }),
    },
  };
  const rbac = {
    resolveScopeIds: jest.fn().mockResolvedValue(scope),
    // Real implementation is trivial; mirror it so scope handling is tested.
    employeeScopeWhere: jest.fn(
      (s: { kind: string; employeeIds?: string[] }) =>
        s.kind === 'NONE'
          ? null
          : s.kind === 'ALL'
            ? {}
            : { employeeId: { in: [...(s.employeeIds ?? [])] } },
    ),
  };
  const service = new AttendanceTimelineService(
    prisma as unknown as ConstructorParameters<
      typeof AttendanceTimelineService
    >[0],
    rbac as unknown as ConstructorParameters<
      typeof AttendanceTimelineService
    >[1],
  );
  return { service, prisma, rbac };
}

describe('AttendanceTimelineService', () => {
  it('404s with NONE scope without touching sessions', async () => {
    const { service, prisma } = makeService({ kind: 'NONE' });
    await expect(service.getSessionTimeline(USER, 's1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.attendanceSession.findFirst).not.toHaveBeenCalled();
  });

  it('filters the session by tenant, deletedAt and data scope', async () => {
    const { service, prisma, rbac } = makeService({
      kind: 'IDS',
      employeeIds: ['e1', 'e2'],
      userIds: [],
    });
    await service.getSessionTimeline(USER, 's1');
    expect(rbac.resolveScopeIds).toHaveBeenCalledWith(
      't1',
      'admin-1',
      'ATTENDANCE',
      ['READ', 'READ_OWN'],
    );
    expect(prisma.attendanceSession.findFirst.mock.calls[0][0].where).toEqual({
      id: 's1',
      tenantId: 't1',
      deletedAt: null,
      employeeId: { in: ['e1', 'e2'] },
    });
  });

  it('404s (not 403) for a session outside scope or tenant', async () => {
    const { service, prisma } = makeService();
    prisma.attendanceSession.findFirst.mockResolvedValue(null);
    await expect(service.getSessionTimeline(USER, 's1')).rejects.toThrow(
      'Attendance session not found',
    );
    expect(prisma.attendanceBreak.findMany).not.toHaveBeenCalled();
  });

  it('merges punches, breaks, gaps and corrections in time order', async () => {
    const { service, prisma } = makeService();
    prisma.attendanceBreak.findMany.mockResolvedValue([
      {
        id: 'b1',
        breakType: 'LUNCH',
        paidBreak: false,
        startTime: at('13:00'),
        endTime: at('13:30'),
        durationMinutes: 30,
      },
    ]);
    prisma.trackingGap.findMany.mockResolvedValue([
      {
        id: 'g1',
        reason: 'GPS_OFF',
        startedAt: at('11:00'),
        endedAt: at('11:20'),
        durationMinutes: 20,
        batteryLevel: 15,
        isExcused: false,
      },
    ]);
    prisma.attendanceCorrection.findMany.mockResolvedValue([
      {
        id: 'c1',
        correctionType: 'PUNCH_OUT',
        currentValue: null,
        requestedValue: '18:00',
        reason: 'Forgot',
        workflowStatus: 'APPROVED',
        approvedAt: at('19:00'),
        createdAt: at('18:30'),
      },
    ]);
    const timeline = await service.getSessionTimeline(USER, 's1');
    expect(timeline.events.map((e) => e.type)).toEqual([
      'CHECK_IN',
      'TRACKING_GAP_START',
      'TRACKING_GAP_END',
      'BREAK_START',
      'BREAK_END',
      'CHECK_OUT',
      'CORRECTION_REQUESTED',
      'CORRECTION_DECIDED',
    ]);
    expect(timeline.events[0].detail).toMatchObject({
      latitude: 13.08,
      method: 'GPS',
      spoofed: false,
    });
  });

  it('scopes child queries to the tenant and this session', async () => {
    const { service, prisma } = makeService();
    await service.getSessionTimeline(USER, 's1');
    expect(prisma.attendanceBreak.findMany.mock.calls[0][0].where).toEqual({
      tenantId: 't1',
      attendanceSessionId: 's1',
      deletedAt: null,
    });
    expect(prisma.trackingGap.findMany.mock.calls[0][0].where).toEqual({
      tenantId: 't1',
      attendanceSessionId: 's1',
      deletedAt: null,
    });
    expect(prisma.attendanceCorrection.findMany.mock.calls[0][0].where).toEqual(
      {
        tenantId: 't1',
        attendanceId: 'a1',
        employeeId: 'e1',
        deletedAt: null,
      },
    );
  });

  it('open session: no CHECK_OUT, open break has no end, tracking window runs to now', async () => {
    const { service, prisma } = makeService();
    prisma.attendanceSession.findFirst.mockResolvedValue(
      session({ punchOut: null }),
    );
    prisma.attendanceBreak.findMany.mockResolvedValue([
      {
        id: 'b1',
        breakType: 'TEA',
        paidBreak: true,
        startTime: at('10:00'),
        endTime: null,
        durationMinutes: null,
      },
    ]);
    const before = Date.now();
    const timeline = await service.getSessionTimeline(USER, 's1');
    expect(timeline.events.map((e) => e.type)).toEqual([
      'CHECK_IN',
      'BREAK_START',
    ]);
    const window = prisma.employeeLocation.aggregate.mock.calls[0][0].where;
    expect(window.capturedAt.gte).toEqual(at('09:00'));
    expect(window.capturedAt.lte.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('returns tracking point counts, not raw breadcrumbs', async () => {
    const { service, prisma } = makeService();
    prisma.employeeLocation.aggregate.mockResolvedValue({
      _count: { _all: 42 },
      _min: { capturedAt: at('09:01') },
      _max: { capturedAt: at('17:59') },
    });
    const timeline = await service.getSessionTimeline(USER, 's1');
    expect(timeline.tracking).toEqual({
      points: 42,
      firstAt: at('09:01'),
      lastAt: at('17:59'),
    });
    expect(prisma.employeeLocation.aggregate.mock.calls[0][0].where).toEqual({
      tenantId: 't1',
      employeeId: 'e1',
      capturedAt: { gte: at('09:00'), lte: at('18:00') },
    });
  });
});
