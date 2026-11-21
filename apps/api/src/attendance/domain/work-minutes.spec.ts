import {
  creditWorkedMinutes,
  punchTimesProblem,
  recreditDay,
} from './work-minutes';

describe('creditWorkedMinutes', () => {
  const session = {
    id: 'session-1',
    attendanceId: 'attendance-1',
    punchIn: new Date('2026-07-16T09:00:00Z'),
  };

  function makeTx(unpaidBreakMinutes: number | null) {
    return {
      attendanceBreak: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { durationMinutes: unpaidBreakMinutes } }),
      },
      attendance: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
  }

  it('credits the punch span minus unpaid breaks', async () => {
    const tx = makeTx(45);
    const punchOut = new Date('2026-07-16T17:30:00Z'); // 510 min span

    const worked = await creditWorkedMinutes(tx, session, punchOut);

    expect(worked).toBe(465);
    expect(tx.attendanceBreak.aggregate).toHaveBeenCalledWith({
      where: { attendanceSessionId: 'session-1', paidBreak: false },
      _sum: { durationMinutes: true },
    });
    expect(tx.attendance.update).toHaveBeenCalledWith({
      where: { id: 'attendance-1' },
      data: { totalWorkMinutes: { increment: 465 } },
    });
  });

  it('treats no unpaid breaks as zero deduction', async () => {
    const tx = makeTx(null);
    const punchOut = new Date('2026-07-16T17:00:00Z'); // 480 min span

    await expect(creditWorkedMinutes(tx, session, punchOut)).resolves.toBe(480);
  });

  it('never credits negative minutes', async () => {
    const tx = makeTx(600); // breaks exceed span
    const punchOut = new Date('2026-07-16T10:00:00Z'); // 60 min span

    await expect(creditWorkedMinutes(tx, session, punchOut)).resolves.toBe(0);
    expect(tx.attendance.update).toHaveBeenCalledWith({
      where: { id: 'attendance-1' },
      data: { totalWorkMinutes: { increment: 0 } },
    });
  });
});

describe('recreditDay', () => {
  it('resets the day and credits every closed session once', async () => {
    const tx = {
      attendanceBreak: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { durationMinutes: 0 } }),
      },
      attendance: { update: jest.fn().mockResolvedValue({}) },
      attendanceSession: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 's1',
            attendanceId: 'a1',
            punchIn: new Date('2026-07-16T09:00:00Z'),
            punchOut: new Date('2026-07-16T12:00:00Z'),
          },
          {
            id: 's2',
            attendanceId: 'a1',
            punchIn: new Date('2026-07-16T13:00:00Z'),
            punchOut: new Date('2026-07-16T14:30:00Z'),
          },
        ]),
      },
    };
    await expect(recreditDay(tx, 'a1')).resolves.toBe(270);
    expect(tx.attendance.update.mock.calls[0][0]).toEqual({
      where: { id: 'a1' },
      data: { totalWorkMinutes: 0 },
    });
    expect(tx.attendanceSession.findMany).toHaveBeenCalledWith({
      where: { attendanceId: 'a1', deletedAt: null, punchOut: { not: null } },
    });
  });
});

describe('punchTimesProblem', () => {
  const now = new Date('2026-07-16T18:00:00Z');
  const at = (t: string) => new Date(`2026-07-16T${t}:00Z`);
  it('accepts an ordered past span and an open session', () => {
    expect(punchTimesProblem(at('09:00'), at('17:00'), now)).toBeNull();
    expect(punchTimesProblem(at('09:00'), null, now)).toBeNull();
  });
  it('refuses check-out at or before check-in', () => {
    expect(punchTimesProblem(at('09:00'), at('08:00'), now)).toMatch(/after/);
    expect(punchTimesProblem(at('09:00'), at('09:00'), now)).toMatch(/after/);
  });
  it('refuses future times and invalid dates', () => {
    expect(punchTimesProblem(at('09:00'), at('19:00'), now)).toMatch(/future/);
    expect(punchTimesProblem(new Date('x'), null, now)).toMatch(/valid/);
  });
});
