export class FaultEscalatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly faultId: string,
    public readonly escalatedToId?: string,
  ) {}
}

export class FaultStatusUpdatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly faultId: string,
    public readonly newStatus: string,
    public readonly customerId?: string,
  ) {}
}
