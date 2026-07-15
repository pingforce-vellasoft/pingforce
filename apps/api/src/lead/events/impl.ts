/** Lead domain events (3.6 EVENT_CATALOG.md §8 — LEAD.CONVERTED). */
export class LeadConvertedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly leadId: string,
    public readonly leadNumber: string,
    public readonly customerId: string,
    public readonly ownerUserId?: string | null,
  ) {}
}
