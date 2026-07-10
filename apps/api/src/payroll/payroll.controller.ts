import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayrollService } from './payroll.service';

@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('structure')
  createStructure(@CurrentTenant() tenantId: string, @Body() data: any) {
    return this.payrollService.createStructure(tenantId, data);
  }

  @Post('cycle')
  createCycle(@CurrentTenant() tenantId: string, @Body() data: any) {
    return this.payrollService.createCycle(tenantId, data);
  }

  @Get('cycles')
  getCycles(
    @CurrentTenant() tenantId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.payrollService.getCycles(
      tenantId,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Get('cycle/:cycleId/payslips')
  getPayslips(
    @CurrentTenant() tenantId: string,
    @Param('cycleId') cycleId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.payrollService.getPayslips(
      tenantId,
      cycleId,
      skip ? parseInt(skip, 10) : undefined,
      take ? parseInt(take, 10) : undefined,
    );
  }

  @Post('generate-payslip')
  generatePayslip(
    @CurrentTenant() tenantId: string,
    @Body() data: { employeeId: string; payrollCycleId: string },
  ) {
    return this.payrollService.generatePayslip(
      tenantId,
      data.employeeId,
      data.payrollCycleId,
    );
  }
}
