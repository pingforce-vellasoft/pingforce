import { IsString, Matches, MaxLength } from 'class-validator';

export class UploadFileDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Z_]+$/, {
    message: 'entityType must be an UPPER_SNAKE_CASE entity name',
  })
  readonly entityType!: string;

  @IsString()
  @MaxLength(64)
  readonly entityId!: string;
}
