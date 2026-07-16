import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  readonly deviceId!: string;

  @IsString()
  @IsNotEmpty()
  readonly fcmToken!: string;

  @IsOptional()
  @IsIn(['ANDROID', 'IOS', 'WEB'])
  readonly platform?: string;
}
