/**
 * Credits a closed session's worked minutes onto its parent Attendance row.
 * Worked time = punchIn→punchOut span minus unpaid break minutes.
 *
 * Must run inside the same transaction as the punch-out write so the
 * attendance day total can never drift from its sessions.
 */
interface WorkMinutesTx {
  attendanceBreak: {
    aggregate(args: {
      where: { attendanceSessionId: string; paidBreak: boolean };
      _sum: { durationMinutes: true };
    }): Promise<{ _sum: { durationMinutes: number | null } }>;
  };
  attendance: {
    update(args: {
      where: { id: string };
      data: { totalWorkMinutes: { increment: number } };
    }): Promise<unknown>;
  };
}

export async function creditWorkedMinutes(
  tx: WorkMinutesTx,
  session: { id: string; attendanceId: string; punchIn: Date },
  punchOut: Date,
): Promise<number> {
  const sessionMinutes = Math.round(
    (punchOut.getTime() - session.punchIn.getTime()) / 60000,
  );

  const unpaidBreaks = await tx.attendanceBreak.aggregate({
    where: { attendanceSessionId: session.id, paidBreak: false },
    _sum: { durationMinutes: true },
  });

  const workedMinutes = Math.max(
    0,
    sessionMinutes - (unpaidBreaks._sum.durationMinutes ?? 0),
  );

  await tx.attendance.update({
    where: { id: session.attendanceId },
    data: { totalWorkMinutes: { increment: workedMinutes } },
  });

  return workedMinutes;
}
