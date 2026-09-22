import { BadRequestException } from '@nestjs/common';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

export interface LeaveCalendarPolicy {
  readonly weekendDays: readonly number[];
  readonly holidays: readonly string[];
}

export function calendarPolicy(metadata: unknown): LeaveCalendarPolicy {
  const root = metadata as {
    leaveCalendar?: Partial<LeaveCalendarPolicy>;
  } | null;
  const policy = root?.leaveCalendar;
  // Existing tenants retain calendar-day charging until explicitly configured.
  const weekendDays = policy?.weekendDays ?? [];
  const holidays = policy?.holidays ?? [];
  if (
    !Array.isArray(weekendDays) ||
    !weekendDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) ||
    !Array.isArray(holidays) ||
    !holidays.every(
      (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d),
    )
  ) {
    throw new BadRequestException(
      'Leave calendar configuration is invalid; contact your administrator',
    );
  }
  return { weekendDays, holidays };
}

export function calculateLeaveDays(
  dto: CreateLeaveRequestDto,
  policy: LeaveCalendarPolicy,
): number {
  const start = new Date(`${dto.startDate}T00:00:00.000Z`);
  const end = new Date(`${dto.endDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start.toISOString().slice(0, 10) !== dto.startDate ||
    end.toISOString().slice(0, 10) !== dto.endDate ||
    end < start
  ) {
    throw new BadRequestException(
      'Provide valid dates with end date on or after start date',
    );
  }
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    throw new BadRequestException(
      'Submit a separate leave request for each calendar year',
    );
  }
  const duration = dto.duration ?? 'FULL_DAY';
  if (
    !['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF'].includes(duration) ||
    (duration !== 'FULL_DAY' && start.getTime() !== end.getTime())
  ) {
    throw new BadRequestException(
      'Half-day leave must start and end on the same date',
    );
  }
  let days = 0;
  for (let day = start.getTime(); day <= end.getTime(); day += 86_400_000) {
    const date = new Date(day);
    if (
      !policy.weekendDays.includes(date.getUTCDay()) &&
      !policy.holidays.includes(date.toISOString().slice(0, 10))
    )
      days++;
  }
  if (!days)
    throw new BadRequestException(
      'The selected dates contain no chargeable working days',
    );
  return duration === 'FULL_DAY' ? days : 0.5;
}
