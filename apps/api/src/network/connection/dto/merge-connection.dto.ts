import { IsUUID } from 'class-validator';

/**
 * Merge: re-parents every child of the source connection onto the target
 * connection, then archives the source node.
 */
export class MergeConnectionDto {
  @IsUUID()
  readonly targetConnectionId!: string;
}
