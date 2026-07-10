import { IsString } from 'class-validator';

export class UpdateLeadOwnerDto {
  @IsString()
  ownerUserId!: string;
}
