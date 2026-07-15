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

export class BreakStartedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly employeeId: string,
    public readonly sessionId: string,
    public readonly breakId: string,
  ) {}
}

export class BreakEndedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly employeeId: string,
    public readonly sessionId: string,
    public readonly breakId: string,
    public readonly durationMinutes: number,
  ) {}
}
