import { ConflictException } from '@nestjs/common';
import {
  SessionState,
  canTransition,
  assertTransition,
  resolveState,
} from './session-state';

describe('attendance session-state machine (STATE_MACHINE.md §3-§4)', () => {
  it('allows check-in → working → check-out', () => {
    expect(canTransition(SessionState.CHECKED_IN, SessionState.WORKING)).toBe(
      true,
    );
    expect(canTransition(SessionState.WORKING, SessionState.CHECKED_OUT)).toBe(
      true,
    );
  });

  it('allows direct check-out from any open state', () => {
    expect(
      canTransition(SessionState.CHECKED_IN, SessionState.CHECKED_OUT),
    ).toBe(true);
  });

  it('CHECKED_OUT is terminal — corrections go through the workflow', () => {
    for (const to of Object.values(SessionState)) {
      expect(canTransition(SessionState.CHECKED_OUT, to)).toBe(false);
    }
  });

  it('rejects re-check-in on an open session', () => {
    expect(canTransition(SessionState.WORKING, SessionState.CHECKED_IN)).toBe(
      false,
    );
  });

  it('assertTransition throws 409 on invalid transitions', () => {
    expect(() =>
      assertTransition(SessionState.CHECKED_OUT, SessionState.WORKING),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransition(SessionState.CHECKED_IN, SessionState.CHECKED_OUT),
    ).not.toThrow();
  });

  it('resolveState treats legacy/unknown statuses as WORKING', () => {
    // Breaks were removed: sessions persisted as ON_BREAK before the removal
    // must resolve to WORKING so they can still be checked out.
    expect(resolveState('ON_BREAK')).toBe(SessionState.WORKING);
    expect(resolveState(null)).toBe(SessionState.WORKING);
    expect(resolveState('LEGACY')).toBe(SessionState.WORKING);
  });
});
