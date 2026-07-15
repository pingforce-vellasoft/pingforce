import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsLatitude,
  IsLongitude,
} from 'class-validator';

/** Body for lifecycle actions (accept/reject/start/pause/resume/cancel/abort/reopen). */
export class VisitActionDto {
  @IsOptional()
  @IsString()
  readonly notes?: string;

  @IsOptional()
  @IsLatitude()
  readonly latitude?: number;

  @IsOptional()
  @IsLongitude()
  readonly longitude?: number;
}

export class AssignVisitDto extends VisitActionDto {
  @IsUUID()
  readonly employeeId!: string;
}

export class CompleteVisitDto extends VisitActionDto {
  @IsString()
  @IsNotEmpty()
  readonly outcome!: string;
}

export class AddVisitNoteDto {
  @IsString()
  @IsNotEmpty()
  readonly note!: string;
}
