export class FaultCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly faultId: string,
    public readonly faultNumber: string,
    public readonly title: string,
    public readonly priority: string,
    public readonly customerId?: string,
    public readonly assignedToId?: string,
  ) {}
}

export class FaultAssignedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly faultId: string,
    public readonly faultNumber: string,
    public readonly assignedToId: string,
    public readonly assignedById?: string,
  ) {}
}

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
    public readonly faultNumber?: string,
  ) {}
}

/** A customer added a note to their complaint from the portal/mobile app. */
export class FaultCommentedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly faultId: string,
    public readonly faultNumber: string,
    public readonly assignedToId?: string,
  ) {}
}

export class FaultReopenedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly faultId: string,
    public readonly faultNumber: string,
    public readonly assignedToId?: string,
  ) {}
}

/** Raised by the SLA monitor when a fault crosses the warning threshold. */
export class FaultSlaWarningEvent {
  constructor(
    public readonly tenantId: string,
    public readonly faultId: string,
    public readonly faultNumber: string,
    public readonly slaDeadline: Date,
    public readonly assignedToId?: string,
  ) {}
}
