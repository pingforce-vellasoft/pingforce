import { IsUUID } from 'class-validator';

export class UpdateLeadOwnerDto {
  @IsUUID()
  ownerUserId!: string;
}
