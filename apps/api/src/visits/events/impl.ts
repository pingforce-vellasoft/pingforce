/**
 * Visit domain events (3.2 VISIT_MANAGEMENT.md §9 notification events,
 * published on the in-process @nestjs/cqrs EventBus — no Kafka by ADR).
 */
export class VisitAssignedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly visitId: string,
    public readonly visitNumber: string,
    public readonly purpose: string,
    public readonly employeeId: string,
  ) {}
}

export class VisitStatusChangedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly visitId: string,
    public readonly visitNumber: string,
    public readonly newStatus: string,
    public readonly createdBy?: string | null,
    public readonly employeeId?: string | null,
  ) {}
}
