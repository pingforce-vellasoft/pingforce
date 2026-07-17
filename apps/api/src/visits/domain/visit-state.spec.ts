import { ConflictException } from '@nestjs/common';
import {
  VisitState,
  canTransition,
  assertTransition,
  resolveState,
  ACTIVE_STATES,
  READ_ONLY_STATES,
} from './visit-state';

describe('visit-state machine (VISIT_MANAGEMENT.md §4)', () => {
  it('allows the happy-path lifecycle', () => {
    expect(canTransition(VisitState.PLANNED, VisitState.ASSIGNED)).toBe(true);
    expect(canTransition(VisitState.ASSIGNED, VisitState.ACCEPTED)).toBe(true);
    expect(canTransition(VisitState.ACCEPTED, VisitState.STARTED)).toBe(true);
    expect(canTransition(VisitState.STARTED, VisitState.COMPLETED)).toBe(true);
    expect(canTransition(VisitState.COMPLETED, VisitState.APPROVED)).toBe(true);
    expect(canTransition(VisitState.APPROVED, VisitState.CLOSED)).toBe(true);
  });

  it('allows pause/resume and reopen', () => {
    expect(canTransition(VisitState.STARTED, VisitState.PAUSED)).toBe(true);
    expect(canTransition(VisitState.PAUSED, VisitState.STARTED)).toBe(true);
    expect(canTransition(VisitState.COMPLETED, VisitState.STARTED)).toBe(true);
  });

  it('allows reassignment and rejection recovery', () => {
    expect(canTransition(VisitState.ASSIGNED, VisitState.ASSIGNED)).toBe(true);
    expect(canTransition(VisitState.ASSIGNED, VisitState.REJECTED)).toBe(true);
    expect(canTransition(VisitState.REJECTED, VisitState.ASSIGNED)).toBe(true);
  });

  it('rejects skipping lifecycle stages', () => {
    expect(canTransition(VisitState.PLANNED, VisitState.STARTED)).toBe(false);
    expect(canTransition(VisitState.PLANNED, VisitState.COMPLETED)).toBe(false);
    expect(canTransition(VisitState.ASSIGNED, VisitState.COMPLETED)).toBe(
      false,
    );
    expect(canTransition(VisitState.ACCEPTED, VisitState.APPROVED)).toBe(false);
  });

  it('treats CLOSED / CANCELLED / ABORTED as terminal', () => {
    for (const terminal of [
      VisitState.CLOSED,
      VisitState.CANCELLED,
      VisitState.ABORTED,
    ]) {
      for (const to of Object.values(VisitState)) {
        expect(canTransition(terminal, to)).toBe(false);
      }
    }
  });

  it('assertTransition throws 409 on invalid transitions', () => {
    expect(() =>
      assertTransition(VisitState.PLANNED, VisitState.COMPLETED),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransition(VisitState.ASSIGNED, VisitState.ACCEPTED),
    ).not.toThrow();
  });

  it('resolveState falls back to PLANNED for unknown statuses', () => {
    expect(resolveState('STARTED')).toBe(VisitState.STARTED);
    expect(resolveState('GARBAGE')).toBe(VisitState.PLANNED);
    expect(resolveState(null)).toBe(VisitState.PLANNED);
    expect(resolveState(undefined)).toBe(VisitState.PLANNED);
  });

  it('classifies active and read-only states per §7', () => {
    expect(ACTIVE_STATES).toEqual([VisitState.STARTED, VisitState.PAUSED]);
    expect(READ_ONLY_STATES).toContain(VisitState.COMPLETED);
    expect(READ_ONLY_STATES).toContain(VisitState.CLOSED);
    expect(READ_ONLY_STATES).not.toContain(VisitState.STARTED);
  });
});
