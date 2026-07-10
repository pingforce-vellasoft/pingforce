export class CreateFaultCommand {
  constructor(
    public readonly tenantId: string,
    public readonly currentUser: any,
    public readonly createFaultDto: any,
  ) {}
}
export class UpdateFaultCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly currentUser: any,
    public readonly updateFaultDto: any,
  ) {}
}
export class UpdateFaultStatusCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly currentUser: any,
    public readonly updateFaultStatusDto: any,
  ) {}
}
export class EscalateFaultCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly currentUser: any,
  ) {}
}
export class RemoveFaultCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
  ) {}
}
