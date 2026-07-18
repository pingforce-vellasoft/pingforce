import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';

/**
 * Dashboard aggregate composition (DASHBOARD_SPEC.md §4): attendance status
 * derivation, lateness, KPI severity and graceful degradation.
 */

type RepoMock = {
  [K in keyof DashboardRepository]: jest.Mock;
};

const ctx = { userId: 'u1', tenantId: 't1', role: 'Field Technician' };

function makeService(repoOverrides: Partial<RepoMock> = {}) {
  const repo: RepoMock = {
    findEmployeeByUser: jest.fn().mockResolvedValue({
      id: 'e1',
      firstName: 'Ahmed',
      lastName: 'Ali',
      photograph: null,
      reportingManagerId: null,
      department: { name: 'Operations' },
    }),
    hasDirectReports: jest.fn().mockResolvedValue(false),
    findTodayAttendance: jest.fn().mockResolvedValue(null),
    faultCounts: jest.fn().mockResolvedValue({ open: 0, overdue: 0 }),
    visitCounts: jest
      .fn()
      .mockResolvedValue({ total: 0, completed: 0, remaining: 0 }),
    ...repoOverrides,
  };
  const service = new DashboardService(
    repo as unknown as DashboardRepository,
  );
  return { service, repo };
}

/** Build an attendance day-row with one session. */
function dayRow(session: {
  punchIn: Date;
  punchOut?: Date | null;
  breaks?: number;
}) {
  return {
    id: 'att1',
    status: 'PRESENT',
    shift: {
      name: 'Morning Shift',
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15,
    },
    sessions: [
      {
        id: 's1',
        punchIn: session.punchIn,
        punchOut: session.punchOut ?? null,
        sessionStatus: 'OPEN',
        breaks: Array.from({ length: session.breaks ?? 0 }, (_, i) => ({
          id: `b${i}`,
        })),
      },
    ],
  };
}

describe('DashboardService', () => {
  it('returns an empty summary when the user has no employee record', async () => {
    const { service } = makeService({
      findEmployeeByUser: jest.fn().mockResolvedValue(null),
    });
    const summary = await service.getSummary(ctx);
    expect(summary.user.employeeId).toBeNull();
    expect(summary.kpiCards).toHaveLength(0);
    expect(summary.attendance.status).toBe('noShift');
  });

  it('reports noShift when there is no attendance row today', async () => {
    const { service } = makeService();
    const summary = await service.getSummary(ctx);
    expect(summary.attendance.status).toBe('noShift');
  });

  it('reports working with an open session', async () => {
    const punchIn = new Date();
    punchIn.setHours(9, 0, 0, 0);
    const { service } = makeService({
      findTodayAttendance: jest.fn().mockResolvedValue(dayRow({ punchIn })),
    });
    const summary = await service.getSummary(ctx);
    expect(summary.attendance.status).toBe('working');
    expect(summary.attendance.checkInTime).not.toBeNull();
    expect(summary.attendance.workedMinutes).toBeGreaterThanOrEqual(0);
  });

  it('reports checkedOut when every session is closed', async () => {
    const punchIn = new Date();
    punchIn.setHours(9, 0, 0, 0);
    const punchOut = new Date(punchIn.getTime() + 8 * 3600 * 1000);
    const { service } = makeService({
      findTodayAttendance: jest
        .fn()
        .mockResolvedValue(dayRow({ punchIn, punchOut })),
    });
    const summary = await service.getSummary(ctx);
    expect(summary.attendance.status).toBe('checkedOut');
    expect(summary.attendance.checkOutTime).not.toBeNull();
  });

  it('flags lateness beyond the grace period', async () => {
    const punchIn = new Date();
    punchIn.setHours(9, 30, 0, 0); // 30m after 09:00, grace 15m → 15m late
    const { service } = makeService({
      findTodayAttendance: jest.fn().mockResolvedValue(dayRow({ punchIn })),
    });
    const summary = await service.getSummary(ctx);
    expect(summary.attendance.isLate).toBe(true);
    expect(summary.attendance.minutesLate).toBe(15);
  });

  it('does not flag lateness inside the grace period', async () => {
    const punchIn = new Date();
    punchIn.setHours(9, 10, 0, 0); // within 15m grace
    const { service } = makeService({
      findTodayAttendance: jest.fn().mockResolvedValue(dayRow({ punchIn })),
    });
    const summary = await service.getSummary(ctx);
    expect(summary.attendance.isLate).toBe(false);
  });

  it('marks the fault KPI critical when faults are overdue', async () => {
    const { service } = makeService({
      faultCounts: jest.fn().mockResolvedValue({ open: 3, overdue: 1 }),
    });
    const summary = await service.getSummary(ctx);
    const faults = summary.kpiCards.find((c) => c.id === 'faults');
    expect(faults?.severity).toBe('critical');
    expect(faults?.secondaryLabel).toBe('1 Overdue');
  });

  it('degrades to zero counts when a KPI source throws', async () => {
    const { service } = makeService({
      faultCounts: jest.fn().mockRejectedValue(new Error('db down')),
    });
    const summary = await service.getSummary(ctx);
    const faults = summary.kpiCards.find((c) => c.id === 'faults');
    expect(faults?.primaryValue).toBe('0');
  });

  it('detects a manager via direct reports', async () => {
    const { service } = makeService({
      hasDirectReports: jest.fn().mockResolvedValue(true),
    });
    const summary = await service.getSummary(ctx);
    expect(summary.user.isManager).toBe(true);
  });

  it('emits newest-first activity items for check-in and check-out', async () => {
    const punchIn = new Date();
    punchIn.setHours(9, 0, 0, 0);
    const punchOut = new Date(punchIn.getTime() + 4 * 3600 * 1000);
    const { service } = makeService({
      findTodayAttendance: jest
        .fn()
        .mockResolvedValue(dayRow({ punchIn, punchOut })),
    });
    const summary = await service.getSummary(ctx);
    expect(summary.activityFeed).toHaveLength(2);
    // Newest (checkout) first.
    expect(summary.activityFeed[0].type).toBe('checkOut');
    expect(summary.activityFeed[1].type).toBe('checkIn');
  });
});
