export class EmployeeCheckedInEvent {
  constructor(
    public readonly tenantId: string,
    public readonly employeeId: string,
    public readonly sessionId: string,
    public readonly punchIn: Date,
  ) {}
}

export class EmployeeCheckedOutEvent {
  constructor(
    public readonly tenantId: string,
    public readonly employeeId: string,
    public readonly sessionId: string,
    public readonly punchOut: Date,
  ) {}
}
