import { CurrentUserContext } from '@pingforce-monorepo/shared';
import { AssignFaultDto } from '../dto/assign-fault.dto';
import { CreateFaultDto } from '../dto/create-fault.dto';
import { AddFaultNoteDto } from '../dto/fault-note.dto';
import { UpdateFaultDto } from '../dto/update-fault.dto';
import { UpdateFaultStatusDto } from '../dto/update-fault-status.dto';

export class CreateFaultCommand {
  constructor(
    public readonly tenantId: string,
    public readonly currentUser: CurrentUserContext,
    public readonly createFaultDto: CreateFaultDto,
  ) {}
}
export class UpdateFaultCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly currentUser: CurrentUserContext,
    public readonly updateFaultDto: UpdateFaultDto,
  ) {}
}
export class UpdateFaultStatusCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly currentUser: CurrentUserContext,
    public readonly updateFaultStatusDto: UpdateFaultStatusDto,
  ) {}
}
export class AssignFaultCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly currentUser: CurrentUserContext,
    public readonly assignFaultDto: AssignFaultDto,
  ) {}
}
export class AddFaultNoteCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly currentUser: CurrentUserContext,
    public readonly dto: AddFaultNoteDto,
  ) {}
}
export class SetTimelineVisibilityCommand {
  constructor(
    public readonly tenantId: string,
    public readonly faultId: string,
    public readonly entryId: string,
    public readonly isCustomerVisible: boolean,
    public readonly currentUser: CurrentUserContext,
  ) {}
}
export class EscalateFaultCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly currentUser: CurrentUserContext,
  ) {}
}
export class RemoveFaultCommand {
  constructor(
    public readonly tenantId: string,
    public readonly id: string,
    public readonly currentUser: CurrentUserContext,
  ) {}
}
