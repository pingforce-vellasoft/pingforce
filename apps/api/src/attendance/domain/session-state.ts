import { ConflictException } from '@nestjs/common';

/**
 * Attendance session finite state machine
 * (3.1_AttendanceManagement/STATE_MACHINE.md §3-§4).
 *
 * Persisted in `AttendanceSession.sessionStatus`. A session is created in
 * CHECKED_IN and must end in CHECKED_OUT; invalid transitions are rejected
 * (§2 "Invalid transitions are rejected").
 */
export enum SessionState {
  CHECKED_IN = 'CHECKED_IN',
  WORKING = 'WORKING',
  ON_BREAK = 'ON_BREAK',
  CHECKED_OUT = 'CHECKED_OUT',
}

const ALLOWED_TRANSITIONS: Record<SessionState, readonly SessionState[]> = {
  [SessionState.CHECKED_IN]: [
    SessionState.WORKING,
    SessionState.ON_BREAK,
    SessionState.CHECKED_OUT,
  ],
  [SessionState.WORKING]: [SessionState.ON_BREAK, SessionState.CHECKED_OUT],
  [SessionState.ON_BREAK]: [SessionState.WORKING, SessionState.CHECKED_OUT],
  [SessionState.CHECKED_OUT]: [], // terminal — corrections go through the correction workflow
};

export function canTransition(from: SessionState, to: SessionState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Throws 409 when the transition is not allowed by the state machine. */
export function assertTransition(from: SessionState, to: SessionState): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(
      `Invalid attendance transition ${from} → ${to}`,
    );
  }
}

/** Maps a persisted (possibly legacy/null) status to a SessionState. */
export function resolveState(raw: string | null | undefined): SessionState {
  if (raw && raw in ALLOWED_TRANSITIONS) return raw as SessionState;
  // Legacy rows created before the state machine: treat open as WORKING
  return SessionState.WORKING;
}
