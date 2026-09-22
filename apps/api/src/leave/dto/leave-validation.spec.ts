import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LeaveQueryDto } from './leave-query.dto';
import { CreateLeaveRequestDto } from './create-leave-request.dto';
import { CancelLeaveDto } from './leave-decision.dto';

describe('Leave input validation', () => {
  it.each([
    { skip: '-1' },
    { take: '101' },
    { take: 'abc' },
    { year: '2026oops' },
    { status: 'anything' },
  ])('rejects query %p', async (value) => {
    expect(
      (await validate(plainToInstance(LeaveQueryDto, value))).length,
    ).toBeGreaterThan(0);
  });
  it('transforms valid pagination', async () => {
    const dto = plainToInstance(LeaveQueryDto, {
      take: '10',
      skip: '20',
      year: '2026',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.take).toBe(10);
  });
  it('requires UUIDs and date-only dates', async () => {
    const dto = plainToInstance(CreateLeaveRequestDto, {
      leaveTypeId: 'bad',
      startDate: '2026-09-20T00:00:00Z',
      endDate: '2026-09-20',
    });
    expect((await validate(dto)).length).toBe(2);
  });
  it('requires a meaningful cancellation reason', async () => {
    expect(
      (await validate(plainToInstance(CancelLeaveDto, { reason: '   ' })))
        .length,
    ).toBeGreaterThan(0);
  });
});
