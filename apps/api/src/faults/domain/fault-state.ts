import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * Fault lifecycle finite state machine.
 *
 * Persisted in `Fault.status`. Invalid transitions are rejected with 409,
 * mirroring the Visit state machine (visits/domain/visit-state.ts).
 *
 * OPEN → ASSIGNED → IN_PROGRESS → ON_HOLD ⇄ IN_PROGRESS → RESOLVED → CLOSED
 * RESOLVED → REOPENED → IN_PROGRESS
 */
export enum FaultState {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  RESOLVED = 'RESOLVED',
  REOPENED = 'REOPENED',
  CLOSED = 'CLOSED',
}

const ALLOWED_TRANSITIONS: Record<FaultState, readonly FaultState[]> = {
  [FaultState.OPEN]: [
    FaultState.ASSIGNED,
    FaultState.IN_PROGRESS,
    FaultState.CLOSED, // closed without work (duplicate/invalid)
  ],
  [FaultState.ASSIGNED]: [
    FaultState.OPEN, // explicit return to the unassigned queue
    FaultState.ASSIGNED, // reassignment
    FaultState.IN_PROGRESS,
    FaultState.ON_HOLD,
    FaultState.CLOSED,
  ],
  [FaultState.IN_PROGRESS]: [
    FaultState.ON_HOLD,
    FaultState.RESOLVED,
    FaultState.ASSIGNED, // reassignment mid-work
  ],
  [FaultState.ON_HOLD]: [FaultState.IN_PROGRESS, FaultState.CLOSED],
  [FaultState.RESOLVED]: [FaultState.CLOSED, FaultState.REOPENED],
  [FaultState.REOPENED]: [FaultState.IN_PROGRESS, FaultState.ASSIGNED],
  [FaultState.CLOSED]: [],
};

/** States in which the fault is still open work for the assignee. */
export const ACTIVE_STATES: readonly FaultState[] = [
  FaultState.OPEN,
  FaultState.ASSIGNED,
  FaultState.IN_PROGRESS,
  FaultState.ON_HOLD,
  FaultState.REOPENED,
];

/** States that stop the SLA clock — no further breach accrues. */
export const SLA_STOPPED_STATES: readonly FaultState[] = [
  FaultState.RESOLVED,
  FaultState.CLOSED,
];

/** Terminal state — the record is read-only. */
export const TERMINAL_STATES: readonly FaultState[] = [FaultState.CLOSED];

export const NOTE_REQUIRED_STATES: readonly FaultState[] = [
  FaultState.ON_HOLD,
  FaultState.RESOLVED,
  FaultState.REOPENED,
  FaultState.CLOSED,
];

export function canTransition(from: FaultState, to: FaultState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Throws 409 when the transition is not allowed by the state machine. */
export function assertTransition(from: FaultState, to: FaultState): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(`Invalid fault transition ${from} → ${to}`);
  }
}

export function assertTransitionNote(
  to: FaultState,
  notes: string | undefined,
): void {
  if (NOTE_REQUIRED_STATES.includes(to) && !notes?.trim()) {
    throw new BadRequestException(
      `A reason or resolution note is required for ${to}`,
    );
  }
}

/** Maps a persisted (possibly unknown) status to a FaultState. */
export function resolveState(raw: string | null | undefined): FaultState {
  if (raw && raw in ALLOWED_TRANSITIONS) return raw as FaultState;
  return FaultState.OPEN;
}
