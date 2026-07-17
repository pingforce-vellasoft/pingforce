import { creditWorkedMinutes } from './work-minutes';

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
