import type { APIRequestContext } from '@playwright/test';
import { test, expect, bearer, type Session } from './fixtures';

/**
 * Leave lifecycle after submission: approve, reject, cancel, overlap and a
 * concurrent double submit. Balances are checked after every step, because a
 * wrong reserved/used/available move is the failure that costs real money.
 *
 * Each test books its own weekday in December of the current year (the seed
 * gives the QA employee a 30-day QA_ANNUAL balance for this year only), and
 * every request it makes is withdrawn or cancelled in `finally`.
 */

interface Balance {
  readonly availableDays: number;
  readonly reservedDays: number;
  readonly usedDays: number;
}
interface Leave {
  readonly id: string;
  readonly status: string;
}

/** Weekdays of December this year, skipping the 15th (LEAVE-003 uses it). */
const decemberWeekdays = (): string[] => {
  const year = new Date().getUTCFullYear();
  const days: string[] = [];
  for (let d = 1; d <= 31; d++) {
    const date = new Date(Date.UTC(year, 11, d));
    if (d !== 15 && date.getUTCDay() !== 0 && date.getUTCDay() !== 6)
      days.push(date.toISOString().slice(0, 10));
  }
  return days;
};
const DAYS = decemberWeekdays();

/** Day counts only: updatedAt/updatedBy change on every write. */
const counts = ({
  availableDays,
  reservedDays,
  usedDays,
}: Balance): Balance => ({
  availableDays,
  reservedDays,
  usedDays,
});

async function annualTypeId(
  request: APIRequestContext,
  employee: Session,
): Promise<string> {
  const response = await request.get('/api/v1/leaves/types', {
    headers: bearer(employee),
  });
  expect(response.status()).toBe(200);
  const types = (await response.json()) as { id: string; code: string }[];
  const type = types.find((item) => item.code === 'QA_ANNUAL');
  expect(type, 'QA_ANNUAL leave type seeded').toBeTruthy();
  return type!.id;
}

async function balance(
  request: APIRequestContext,
  employee: Session,
  typeId: string,
): Promise<Balance> {
  const response = await request.get('/api/v1/leaves/my-balance', {
    headers: bearer(employee),
  });
  expect(response.status()).toBe(200);
  const rows = (await response.json()) as (Balance & {
    leaveTypeId: string;
  })[];
  const row = rows.find((item) => item.leaveTypeId === typeId);
  expect(row).toBeTruthy();
  return row!;
}

const submit = (
  request: APIRequestContext,
  employee: Session,
  typeId: string,
  day: string,
  duration = 'FULL_DAY',
) =>
  request.post('/api/v1/leaves/request', {
    headers: bearer(employee),
    data: {
      leaveTypeId: typeId,
      startDate: day,
      endDate: day,
      duration,
      reason: 'QA leave lifecycle',
    },
  });

async function submitted(
  request: APIRequestContext,
  employee: Session,
  typeId: string,
  day: string,
): Promise<Leave> {
  const response = await submit(request, employee, typeId, day);
  expect(response.status(), await response.text()).toBe(201);
  const leave = (await response.json()) as Leave;
  expect(leave.status).toBe('PENDING');
  return leave;
}

/** Undo whatever state a test left a request in. */
async function cleanUp(
  request: APIRequestContext,
  accounts: Record<string, Session>,
  ids: readonly string[],
): Promise<void> {
  for (const id of ids) {
    await request.post(`/api/v1/leaves/${id}/withdraw`, {
      headers: bearer(accounts.employee),
    });
    await request.post(`/api/v1/leaves/${id}/cancel`, {
      headers: bearer(accounts.admin),
      data: { reason: 'QA clean up' },
    });
  }
}

const decide = (
  request: APIRequestContext,
  admin: Session,
  id: string,
  decision: 'approve' | 'reject',
) =>
  request.post(`/api/v1/leaves/${id}/${decision}`, {
    headers: bearer(admin),
    data: { reason: `QA ${decision}` },
  });

test('LEAVE-004 approve moves reserved to used; cancel restores available', async ({
  request,
  accounts,
}) => {
  const { employee, admin } = accounts;
  const typeId = await annualTypeId(request, employee);
  const before = await balance(request, employee, typeId);
  const leave = await submitted(request, employee, typeId, DAYS[0]);
  try {
    const approved = await decide(request, admin, leave.id, 'approve');
    const approvedText = await approved.text();
    expect(approved.status(), approvedText).toBe(201);
    expect(JSON.parse(approvedText).status, approvedText).toBe('APPROVED');
    const afterApprove = await balance(request, employee, typeId);
    expect(afterApprove.reservedDays).toBe(before.reservedDays);
    expect(afterApprove.usedDays).toBe(before.usedDays + 1);
    expect(afterApprove.availableDays).toBe(before.availableDays - 1);

    // An approved request cannot be decided again or withdrawn by the employee.
    expect((await decide(request, admin, leave.id, 'approve')).status()).toBe(
      409,
    );
    expect(
      (
        await request.post(`/api/v1/leaves/${leave.id}/withdraw`, {
          headers: bearer(employee),
        })
      ).status(),
    ).toBe(409);

    // Cancellation needs a reason; a valid one returns the day.
    expect(
      (
        await request.post(`/api/v1/leaves/${leave.id}/cancel`, {
          headers: bearer(admin),
          data: {},
        })
      ).status(),
    ).toBe(400);
    const cancelled = await request.post(`/api/v1/leaves/${leave.id}/cancel`, {
      headers: bearer(admin),
      data: { reason: 'QA cancel after approval' },
    });
    expect(cancelled.status(), await cancelled.text()).toBe(201);
    expect((await cancelled.json()).status).toBe('CANCELLED');
    const afterCancel = await balance(request, employee, typeId);
    expect(counts(afterCancel)).toEqual(counts(before));

    // A repeated cancel is an idempotent no-op, not a second refund.
    const again = await request.post(`/api/v1/leaves/${leave.id}/cancel`, {
      headers: bearer(admin),
      data: { reason: 'QA cancel twice' },
    });
    expect(again.status(), await again.text()).toBe(201);
    expect(counts(await balance(request, employee, typeId))).toEqual(
      counts(before),
    );
  } finally {
    await cleanUp(request, accounts, [leave.id]);
  }
});

test('LEAVE-005 reject returns the day; no second decision', async ({
  request,
  accounts,
}) => {
  const { employee, admin } = accounts;
  const typeId = await annualTypeId(request, employee);
  const before = await balance(request, employee, typeId);
  const leave = await submitted(request, employee, typeId, DAYS[1]);
  try {
    const rejected = await decide(request, admin, leave.id, 'reject');
    const text = await rejected.text();
    expect(rejected.status(), text).toBe(201);
    expect(JSON.parse(text).status, text).toBe('REJECTED');
    expect(counts(await balance(request, employee, typeId))).toEqual(
      counts(before),
    );
    for (const decision of ['approve', 'reject'] as const)
      expect(
        (await decide(request, admin, leave.id, decision)).status(),
        `${decision} after reject`,
      ).toBe(409);
    expect(
      (
        await request.post(`/api/v1/leaves/${leave.id}/withdraw`, {
          headers: bearer(employee),
        })
      ).status(),
    ).toBe(409);
    expect(counts(await balance(request, employee, typeId))).toEqual(
      counts(before),
    );
  } finally {
    await cleanUp(request, accounts, [leave.id]);
  }
});

test('LEAVE-007 overlapping requests refused; half days combine', async ({
  request,
  accounts,
}) => {
  const { employee } = accounts;
  const typeId = await annualTypeId(request, employee);
  const ids: string[] = [];
  try {
    const full = await submitted(request, employee, typeId, DAYS[2]);
    ids.push(full.id);
    for (const duration of ['FULL_DAY', 'FIRST_HALF'])
      expect(
        (await submit(request, employee, typeId, DAYS[2], duration)).status(),
        `${duration} over a full day`,
      ).toBe(409);

    const first = await submit(
      request,
      employee,
      typeId,
      DAYS[3],
      'FIRST_HALF',
    );
    expect(first.status(), await first.text()).toBe(201);
    ids.push((await first.json()).id);
    expect(
      (await submit(request, employee, typeId, DAYS[3], 'FIRST_HALF')).status(),
      'same half twice',
    ).toBe(409);
    const second = await submit(
      request,
      employee,
      typeId,
      DAYS[3],
      'SECOND_HALF',
    );
    expect(second.status(), await second.text()).toBe(201);
    ids.push((await second.json()).id);
  } finally {
    await cleanUp(request, accounts, ids);
  }
});

test('LEAVE-007 concurrent double submit books the day once', async ({
  request,
  accounts,
}) => {
  const { employee } = accounts;
  const typeId = await annualTypeId(request, employee);
  const before = await balance(request, employee, typeId);
  const responses = await Promise.all(
    [0, 1, 2].map(() => submit(request, employee, typeId, DAYS[4])),
  );
  const ids: string[] = [];
  try {
    for (const response of responses)
      if (response.status() === 201) ids.push((await response.json()).id);
    expect(
      responses.map((r) => r.status()).sort(),
      'exactly one request accepted',
    ).toEqual([201, 409, 409]);
    const after = await balance(request, employee, typeId);
    expect(after.reservedDays).toBe(before.reservedDays + 1);
    expect(after.availableDays).toBe(before.availableDays - 1);
  } finally {
    await cleanUp(request, accounts, ids);
  }
});
