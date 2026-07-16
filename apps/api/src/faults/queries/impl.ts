export class GetFaultsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly requesterUserId: string,
    public readonly skip?: number,
    public readonly take?: number,
  ) {}
}
export class GetAssignedFaultsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly skip?: number,
    public readonly take?: number,
  ) {}
}
export class GetFaultByIdQuery {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
  ) {}
}
export class GetBreachedFaultsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly requesterUserId: string,
    public readonly skip?: number,
    public readonly take?: number,
  ) {}
}
