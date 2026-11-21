/**
 * Leave tests book days in NEXT year, so they never land in the past or
 * straddle a year end, whatever date CI runs on. qa/seed.ts gives the QA
 * employee a QA_ANNUAL balance for this year and next year.
 */
export const LEAVE_YEAR = new Date().getUTCFullYear() + 1;

const DAY_MS = 86_400_000;
const isWeekday = (date: Date): boolean =>
  date.getUTCDay() !== 0 && date.getUTCDay() !== 6;

/** Weekdays of January to March of LEAVE_YEAR, as YYYY-MM-DD. */
export const LEAVE_DAYS: readonly string[] = Array.from(
  { length: 90 },
  (_, i) => new Date(Date.UTC(LEAVE_YEAR, 0, 1) + i * DAY_MS),
)
  .filter(isWeekday)
  .map((date) => date.toISOString().slice(0, 10));

/** Balance endpoint for LEAVE_YEAR. */
export const MY_BALANCE_URL = `/api/v1/leaves/my-balance?year=${LEAVE_YEAR}`;
