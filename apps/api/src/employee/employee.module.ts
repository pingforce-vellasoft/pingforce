import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { EmployeeRepository } from '@pingforce-monorepo/shared';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeRepository],
  exports: [EmployeeService],
})
export class EmployeeModule {}
