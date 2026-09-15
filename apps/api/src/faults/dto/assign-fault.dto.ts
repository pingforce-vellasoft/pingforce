import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignFaultDto {
  /** Target assignee. Omit to unassign the fault back to the queue. */
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
