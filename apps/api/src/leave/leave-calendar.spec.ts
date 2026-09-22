import { calculateLeaveDays, calendarPolicy } from './leave-calendar';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

const dto = (
  startDate: string,
  endDate = startDate,
  duration: CreateLeaveRequestDto['duration'] = 'FULL_DAY',
): CreateLeaveRequestDto => ({
  leaveTypeId: 'type',
  startDate,
  endDate,
  duration,
});
describe('Leave calendar', () => {
  it('uses UTC calendar days including leap day', () => {
    expect(
      calculateLeaveDays(dto('2028-02-28', '2028-03-01'), calendarPolicy(null)),
    ).toBe(3);
  });
  it('excludes configured weekends and holidays without double subtraction', () => {
    expect(
      calculateLeaveDays(dto('2026-09-18', '2026-09-22'), {
        weekendDays: [0, 6],
        holidays: ['2026-09-21', '2026-09-20'],
      }),
    ).toBe(2);
  });
  it.each(['FIRST_HALF', 'SECOND_HALF'] as const)(
    'charges %s as half a day',
    (duration) => {
      expect(
        calculateLeaveDays(
          dto('2026-09-21', '2026-09-21', duration),
          calendarPolicy(null),
        ),
      ).toBe(0.5);
    },
  );
  it.each([
    ['2026-09-22', '2026-09-21'],
    ['2026-12-31', '2027-01-01'],
    ['2026-02-30', '2026-03-01'],
    ['invalid', 'invalid'],
  ])('rejects invalid range %s to %s', (start, end) => {
    expect(() =>
      calculateLeaveDays(dto(start, end), calendarPolicy(null)),
    ).toThrow();
  });
  it('rejects a half-day range', () => {
    expect(() =>
      calculateLeaveDays(
        dto('2026-09-21', '2026-09-22', 'FIRST_HALF'),
        calendarPolicy(null),
      ),
    ).toThrow('same date');
  });
  it('rejects zero chargeable days', () => {
    expect(() =>
      calculateLeaveDays(dto('2026-09-20'), { weekendDays: [0], holidays: [] }),
    ).toThrow('no chargeable');
  });
  it('rejects malformed tenant configuration', () => {
    expect(() =>
      calendarPolicy({ leaveCalendar: { weekendDays: [7] } }),
    ).toThrow();
  });
});
