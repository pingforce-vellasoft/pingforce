import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateConnectionDto } from './create-connection.dto';

/**
 * Metadata-only updates. Topology fields (olteId, parentConnectionId) are
 * changed exclusively through the move endpoint so path/depth stay consistent.
 */
export class UpdateConnectionDto extends PartialType(
  OmitType(CreateConnectionDto, [
    'connectionCode',
    'olteId',
    'parentConnectionId',
  ] as const),
) {}
