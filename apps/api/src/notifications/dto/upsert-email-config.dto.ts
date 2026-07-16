import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertEmailConfigDto {
  @IsString()
  @MaxLength(255)
  readonly host!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  readonly port?: number;

  @IsOptional()
  @IsBoolean()
  readonly secure?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  readonly username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  readonly password?: string;

  @IsEmail()
  readonly fromAddress!: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  readonly status?: 'ACTIVE' | 'DISABLED';
}
