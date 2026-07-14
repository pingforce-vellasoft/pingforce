import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  readonly name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly description?: string;
}
