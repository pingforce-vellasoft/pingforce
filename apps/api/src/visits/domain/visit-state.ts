import { ConflictException } from '@nestjs/common';

/**
 * Visit lifecycle finite state machine
 * (3.2_GPSVisitManagement/VISIT_MANAGEMENT.md §4 "Visit Lifecycle").
 *
 * Persisted in `Visit.status`. Invalid transitions are rejected with 409.
 * The spec's travelling/arrived/GPS-validated sub-states are folded into
 * STARTED (GPS validation is recorded on `Visit.gpsValidated` instead);
 * reopening a completed visit returns it to STARTED (§4 alternative states).
 */
export enum VisitState {
  PLANNED = 'PLANNED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  STARTED = 'STARTED',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  ABORTED = 'ABORTED',
}

const ALLOWED_TRANSITIONS: Record<VisitState, readonly VisitState[]> = {
  [VisitState.PLANNED]: [VisitState.ASSIGNED, VisitState.CANCELLED],
  [VisitState.ASSIGNED]: [
    VisitState.ASSIGNED, // reassignment
    VisitState.ACCEPTED,
    VisitState.REJECTED,
    VisitState.CANCELLED,
  ],
  [VisitState.REJECTED]: [VisitState.ASSIGNED, VisitState.CANCELLED],
  [VisitState.ACCEPTED]: [VisitState.STARTED, VisitState.CANCELLED],
  [VisitState.STARTED]: [
    VisitState.PAUSED,
    VisitState.COMPLETED,
    VisitState.ABORTED,
  ],
  [VisitState.PAUSED]: [VisitState.STARTED, VisitState.ABORTED],
  [VisitState.COMPLETED]: [
    VisitState.APPROVED,
    VisitState.STARTED, // reopen
  ],
  [VisitState.APPROVED]: [VisitState.CLOSED],
  [VisitState.CLOSED]: [],
  [VisitState.CANCELLED]: [],
  [VisitState.ABORTED]: [],
};

/** States in which the assignee is actively executing the visit. */
export const ACTIVE_STATES: readonly VisitState[] = [
  VisitState.STARTED,
  VisitState.PAUSED,
];

/** States in which the visit record is read-only (§7 "Completed visits are read-only unless reopened"). */
export const READ_ONLY_STATES: readonly VisitState[] = [
  VisitState.COMPLETED,
  VisitState.APPROVED,
  VisitState.CLOSED,
  VisitState.CANCELLED,
  VisitState.ABORTED,
];

export function canTransition(from: VisitState, to: VisitState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Throws 409 when the transition is not allowed by the state machine. */
export function assertTransition(from: VisitState, to: VisitState): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(`Invalid visit transition ${from} → ${to}`);
  }
}

/** Maps a persisted (possibly unknown) status to a VisitState. */
export function resolveState(raw: string | null | undefined): VisitState {
  if (raw && raw in ALLOWED_TRANSITIONS) return raw as VisitState;
  return VisitState.PLANNED;
}
