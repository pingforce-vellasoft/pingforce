import { PunchDto } from '../dto/attendance.dto';

export class PunchCommand {
  constructor(
    public readonly user: { userId: string; tenantId: string },
    public readonly dto: PunchDto,
  ) {}
}

export class StartBreakCommand {
  constructor(
    public readonly user: { userId: string; tenantId: string },
    public readonly breakType = 'LUNCH',
  ) {}
}

export class EndBreakCommand {
  constructor(public readonly user: { userId: string; tenantId: string }) {}
}
