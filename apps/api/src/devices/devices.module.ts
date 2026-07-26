import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DevicesRepository } from './devices.repository';
import { PrismaModule } from '../prisma/prisma.module';
// AuthModule supplies SessionService: approving or revoking a binding must cut
// the employee's live sessions and refresh tokens (DeviceSecurity.md §12).
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DevicesController],
  providers: [DevicesService, DevicesRepository],
  exports: [DevicesService],
})
export class DevicesModule {}
