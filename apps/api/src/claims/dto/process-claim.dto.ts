import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProcessClaimDto {
  @IsIn(['APPROVED', 'REJECTED'])
  readonly status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly notes?: string;
}
