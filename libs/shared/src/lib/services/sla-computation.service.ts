import { Injectable } from '@nestjs/common';

@Injectable()
export class SlaComputationService {
  /**
   * Calculates the SLA deadline based on the number of hours.
   * This logic skips weekends (Saturday and Sunday).
   *
   * @param resolveInHours The SLA resolution time in hours
   * @param startDate The starting point for the calculation (defaults to now)
   * @returns The computed deadline Date
   */
  calculateSlaDeadline(
    resolveInHours: number,
    startDate: Date = new Date(),
  ): Date {
    const deadline = new Date(startDate.getTime());
    if (resolveInHours <= 0) return deadline;

    // Shift start date to Monday midnight if it's currently on a weekend
    let currentDay = deadline.getDay();
    if (currentDay === 0) {
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(0, 0, 0, 0);
    } else if (currentDay === 6) {
      deadline.setDate(deadline.getDate() + 2);
      deadline.setHours(0, 0, 0, 0);
    }

    // Now guaranteed to start on a weekday
    const WORKING_HOURS_PER_WEEK = 120;
    const weeksToAdd = Math.floor(resolveInHours / WORKING_HOURS_PER_WEEK);
    const remainingHours = resolveInHours % WORKING_HOURS_PER_WEEK;

    // Add full weeks
    deadline.setHours(deadline.getHours() + weeksToAdd * 168);

    const daysToAdd = Math.floor(remainingHours / 24);
    const hoursToAdd = remainingHours % 24;

    currentDay = deadline.getDay();

    // Calculate weekend shift for remaining days
    const extraWeekendDays = currentDay + daysToAdd > 5 ? 2 : 0;

    deadline.setDate(deadline.getDate() + daysToAdd + extraWeekendDays);
    deadline.setHours(deadline.getHours() + hoursToAdd);

    // Final adjustment if adding hours pushed us into Saturday/Sunday
    if (deadline.getDay() === 6) {
      deadline.setDate(deadline.getDate() + 2);
    } else if (deadline.getDay() === 0) {
      deadline.setDate(deadline.getDate() + 1);
    }

    return deadline;
  }
}
