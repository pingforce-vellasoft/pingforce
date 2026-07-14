import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentTenant } from '@pingforce-monorepo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../rbac/guards/rbac.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { PayrollService } from './payroll.service';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';
import { CreatePayrollCycleDto } from './dto/create-payroll-cycle.dto';
import { GeneratePayslipDto } from './dto/generate-payslip.dto';

@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('structure')
  @RequirePermission('PAYROLL', 'CREATE')
  createStructure(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.payrollService.createStructure(tenantId, dto);
  }

  @Post('cycle')
  @RequirePermission('PAYROLL', 'CREATE')
  createCycle(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreatePayrollCycleDto,
  ) {
    return this.payrollService.createCycle(tenantId, dto);
  }

  @Get('cycles')
  @RequirePermission('PAYROLL', 'READ')
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
  @RequirePermission('PAYROLL', 'READ')
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
  @RequirePermission('PAYROLL', 'CREATE')
  generatePayslip(
    @CurrentTenant() tenantId: string,
    @Body() dto: GeneratePayslipDto,
  ) {
    return this.payrollService.generatePayslip(
      tenantId,
      dto.employeeId,
      dto.payrollCycleId,
    );
  }
}
