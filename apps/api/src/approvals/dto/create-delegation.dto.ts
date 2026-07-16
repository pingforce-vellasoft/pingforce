import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateDelegationDto {
  @IsUUID()
  @IsNotEmpty()
  readonly delegatorUserId!: string;

  @IsUUID()
  @IsNotEmpty()
  readonly delegateUserId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z_]+$/)
  @MaxLength(40)
  readonly module?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly reason?: string;

  @IsISO8601()
  readonly startsAt!: string;

  @IsISO8601()
  readonly endsAt!: string;
}
