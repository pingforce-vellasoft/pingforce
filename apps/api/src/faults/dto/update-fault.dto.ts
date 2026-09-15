import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFaultDto } from './create-fault.dto';

/**
 * `faultNumber` is the tenant-unique natural key used for offline-sync
 * idempotency, so it is not editable after creation. Status changes go through
 * PATCH /faults/:id/status so the state machine is enforced.
 */
export class UpdateFaultDto extends PartialType(
  OmitType(CreateFaultDto, [
    'faultNumber',
    'assignedToId',
    'assignToSelf',
  ] as const),
) {}
