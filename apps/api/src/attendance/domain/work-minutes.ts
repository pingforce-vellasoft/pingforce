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

interface RecreditTx extends WorkMinutesTx {
  attendance: WorkMinutesTx['attendance'] & {
    update(args: {
      where: { id: string };
      data: { totalWorkMinutes: number | { increment: number } };
    }): Promise<unknown>;
  };
  attendanceSession: {
    findMany(args: {
      where: {
        attendanceId: string;
        deletedAt: null;
        punchOut: { not: null };
      };
    }): Promise<
      {
        id: string;
        attendanceId: string;
        punchIn: Date;
        punchOut: Date | null;
      }[]
    >;
  };
}

/**
 * Re-derives a day's credited minutes from every closed session after a
 * punch time was edited. creditWorkedMinutes increments, so it cannot simply
 * be re-run on an already-credited day: reset to zero, then credit each
 * closed session once. Returns the new day total.
 */
export async function recreditDay(
  tx: RecreditTx,
  attendanceId: string,
): Promise<number> {
  await tx.attendance.update({
    where: { id: attendanceId },
    data: { totalWorkMinutes: 0 },
  });
  const closed = await tx.attendanceSession.findMany({
    where: { attendanceId, deletedAt: null, punchOut: { not: null } },
  });
  let total = 0;
  for (const s of closed)
    total += await creditWorkedMinutes(tx, s, s.punchOut!);
  return total;
}

/**
 * Shared guard for any edited or admin-set punch time: check-out after
 * check-in, and neither in the future. Returns a message, or null when valid.
 */
export function punchTimesProblem(
  punchIn: Date,
  punchOut: Date | null,
  now: Date = new Date(),
): string | null {
  if (
    Number.isNaN(punchIn.getTime()) ||
    (punchOut && Number.isNaN(punchOut.getTime()))
  )
    return 'Punch times must be valid date-times.';
  if (punchOut && punchOut.getTime() <= punchIn.getTime())
    return 'Check-out must be after check-in.';
  if (punchIn > now || (punchOut && punchOut > now))
    return 'Punch times cannot be in the future.';
  return null;
}
