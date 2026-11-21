import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QaJobsController } from './qa-jobs.controller';

function make() {
  const engine = { escalateOverdue: jest.fn().mockResolvedValue(0) };
  const sla = { scanBreaches: jest.fn().mockResolvedValue(undefined) };
  const scheduler = {
    autoCheckoutOpenSessions: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new QaJobsController(
    engine as never,
    sla as never,
    scheduler as never,
  );
  return { controller, engine, sla, scheduler };
}
const admin = { user: { roleCode: 'ADMIN_MANAGER' } };

describe('QaJobsController', () => {
  const env = process.env.PINGFORCE_ENV;
  afterEach(() => {
    process.env.PINGFORCE_ENV = env;
  });

  it('is a 404 outside the QA stack, even for an admin', async () => {
    process.env.PINGFORCE_ENV = 'production';
    const { controller, sla } = make();
    await expect(controller.run('fault-sla', {}, admin)).rejects.toThrow(
      NotFoundException,
    );
    expect(sla.scanBreaches).not.toHaveBeenCalled();
  });

  it('runs a job as of the given instant in QA', async () => {
    process.env.PINGFORCE_ENV = 'qa';
    const { controller, scheduler } = make();
    const asOf = '2030-01-02T00:05:00.000Z';
    await controller.run('auto-checkout', { asOf }, admin);
    expect(scheduler.autoCheckoutOpenSessions).toHaveBeenCalledWith(
      new Date(asOf),
    );
  });

  it('refuses non-admins and unknown jobs', async () => {
    process.env.PINGFORCE_ENV = 'qa';
    const { controller } = make();
    await expect(
      controller.run('fault-sla', {}, { user: { roleCode: 'EMPLOYEE' } }),
    ).rejects.toThrow(ForbiddenException);
    await expect(controller.run('drop-tables', {}, admin)).rejects.toThrow(
      NotFoundException,
    );
  });
});
