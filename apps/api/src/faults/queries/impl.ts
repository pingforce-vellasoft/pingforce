import { FaultListQueryDto } from '../dto/fault-list-query.dto';

export class GetFaultsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly requesterUserId: string,
    public readonly filter: FaultListQueryDto = {},
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
    public readonly requesterUserId: string,
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
