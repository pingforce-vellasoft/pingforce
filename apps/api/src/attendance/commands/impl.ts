import { PunchDto } from '../dto/attendance.dto';

export class PunchCommand {
  constructor(
    public readonly user: { userId: string; tenantId: string },
    public readonly dto: PunchDto,
  ) {}
}
