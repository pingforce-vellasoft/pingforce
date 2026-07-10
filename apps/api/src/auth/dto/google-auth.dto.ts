import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'The Google Identity Token obtained from the client device',
  })
  @IsNotEmpty()
  @IsString()
  idToken!: string;

  @ApiProperty({ description: 'The tenant code to log into or register under' })
  @IsNotEmpty()
  @IsString()
  tenantCode!: string;
}
