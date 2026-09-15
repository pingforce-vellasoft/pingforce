import { SlaMonitorProcessor } from './sla-monitor.processor';

type ProcessorArgs = ConstructorParameters<typeof SlaMonitorProcessor>;

function makeProcessor() {
  const fault = {
    findMany: jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'fault-1',
          tenantId: 'tenant-1',
          faultNumber: 'PF-1',
          escalationLevel: 0,
          assignedToId: 'tech-1',
        },
      ]),
    update: jest.fn().mockResolvedValue({}),
  };
  const faultTimeline = { create: jest.fn().mockResolvedValue({}) };
  const prisma = {
    fault,
    faultTimeline,
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  const queue = { add: jest.fn().mockResolvedValue({}) };
  const eventBus = { publish: jest.fn() };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  return {
    processor: new SlaMonitorProcessor(
      prisma as unknown as ProcessorArgs[0],
      queue as unknown as ProcessorArgs[1],
      eventBus as unknown as ProcessorArgs[2],
      audit as unknown as ProcessorArgs[3],
    ),
    prisma,
    queue,
    eventBus,
    audit,
  };
}

describe('SlaMonitorProcessor', () => {
  it('registers one repeatable breach scan', async () => {
    const { processor, queue } = makeProcessor();

    await processor.onModuleInit();

    expect(queue.add).toHaveBeenCalledWith(
      'scan-breaches',
      {},
      expect.objectContaining({ jobId: 'sla-breach-scan' }),
    );
  });

  it('auto-escalates with tenant-scoped update, timeline, event and audit', async () => {
    const { processor, prisma, eventBus, audit } = makeProcessor();

    await processor.scanBreaches();

    expect(prisma.fault.update).toHaveBeenCalledWith({
      where: {
        id_tenantId: { id: 'fault-1', tenantId: 'tenant-1' },
      },
      data: { isEscalated: true, escalationLevel: 1 },
    });
    expect(prisma.faultTimeline.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        faultId: 'fault-1',
        status: 'AUTO_ESCALATED',
      }),
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        faultId: 'fault-1',
        escalatedToId: 'tech-1',
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        action: 'SLA_BREACH_AUTO_ESCALATION',
      }),
    );
  });
});
