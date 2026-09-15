import { ConflictException } from '@nestjs/common';
import {
  FaultState,
  canTransition,
  assertTransition,
  resolveState,
  ACTIVE_STATES,
  SLA_STOPPED_STATES,
  TERMINAL_STATES,
  assertTransitionNote,
} from './fault-state';

describe('fault-state machine (3.3_FaultManagement)', () => {
  it('allows the happy-path lifecycle', () => {
    expect(canTransition(FaultState.OPEN, FaultState.ASSIGNED)).toBe(true);
    expect(canTransition(FaultState.ASSIGNED, FaultState.IN_PROGRESS)).toBe(
      true,
    );
    expect(canTransition(FaultState.IN_PROGRESS, FaultState.RESOLVED)).toBe(
      true,
    );
    expect(canTransition(FaultState.RESOLVED, FaultState.CLOSED)).toBe(true);
  });

  it('allows hold/resume around active work', () => {
    expect(canTransition(FaultState.IN_PROGRESS, FaultState.ON_HOLD)).toBe(
      true,
    );
    expect(canTransition(FaultState.ON_HOLD, FaultState.IN_PROGRESS)).toBe(
      true,
    );
  });

  it('allows the customer reopen path', () => {
    expect(canTransition(FaultState.RESOLVED, FaultState.REOPENED)).toBe(true);
    expect(canTransition(FaultState.REOPENED, FaultState.IN_PROGRESS)).toBe(
      true,
    );
    expect(canTransition(FaultState.REOPENED, FaultState.ASSIGNED)).toBe(true);
  });

  it('allows reassignment without resetting work', () => {
    expect(canTransition(FaultState.ASSIGNED, FaultState.ASSIGNED)).toBe(true);
    expect(canTransition(FaultState.IN_PROGRESS, FaultState.ASSIGNED)).toBe(
      true,
    );
  });

  it('rejects skipping lifecycle stages', () => {
    expect(canTransition(FaultState.OPEN, FaultState.RESOLVED)).toBe(false);
    expect(canTransition(FaultState.ASSIGNED, FaultState.RESOLVED)).toBe(false);
    expect(canTransition(FaultState.ON_HOLD, FaultState.RESOLVED)).toBe(false);
  });

  it('rejects reopening a closed fault — a new fault must be raised', () => {
    expect(canTransition(FaultState.CLOSED, FaultState.REOPENED)).toBe(false);
    expect(canTransition(FaultState.CLOSED, FaultState.IN_PROGRESS)).toBe(
      false,
    );
    expect(canTransition(FaultState.CLOSED, FaultState.OPEN)).toBe(false);
  });

  it('rejects reopening straight back to OPEN', () => {
    // The customer portal must land on REOPENED so reopenCount is tracked.
    expect(canTransition(FaultState.RESOLVED, FaultState.OPEN)).toBe(false);
  });

  it('assertTransition throws 409 on an illegal move', () => {
    expect(() =>
      assertTransition(FaultState.OPEN, FaultState.RESOLVED),
    ).toThrow(ConflictException);
    expect(() =>
      assertTransition(FaultState.OPEN, FaultState.ASSIGNED),
    ).not.toThrow();
  });

  it('resolveState falls back to OPEN for unknown persisted values', () => {
    expect(resolveState('IN_PROGRESS')).toBe(FaultState.IN_PROGRESS);
    expect(resolveState('AUTO_ESCALATED')).toBe(FaultState.OPEN);
    expect(resolveState(null)).toBe(FaultState.OPEN);
    expect(resolveState(undefined)).toBe(FaultState.OPEN);
  });

  it('classifies states for SLA and queue filtering', () => {
    expect(ACTIVE_STATES).toContain(FaultState.ON_HOLD);
    expect(ACTIVE_STATES).toContain(FaultState.REOPENED);
    expect(ACTIVE_STATES).not.toContain(FaultState.RESOLVED);
    expect(ACTIVE_STATES).not.toContain(FaultState.CLOSED);

    expect(SLA_STOPPED_STATES).toEqual([
      FaultState.RESOLVED,
      FaultState.CLOSED,
    ]);
    expect(TERMINAL_STATES).toEqual([FaultState.CLOSED]);
  });

  it('requires meaningful notes for hold and terminal transitions', () => {
    expect(() =>
      assertTransitionNote(FaultState.ON_HOLD, 'waiting'),
    ).not.toThrow();
    expect(() =>
      assertTransitionNote(FaultState.RESOLVED, 'fixed'),
    ).not.toThrow();
    expect(() => assertTransitionNote(FaultState.CLOSED, '  ')).toThrow(
      'required',
    );
    expect(() =>
      assertTransitionNote(FaultState.IN_PROGRESS, undefined),
    ).not.toThrow();
  });
});
