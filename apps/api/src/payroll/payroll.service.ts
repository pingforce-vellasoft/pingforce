import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';
import { CreatePayrollCycleDto } from './dto/create-payroll-cycle.dto';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService,
    @InjectQueue('payroll') private payrollQueue: Queue,
  ) {}

  async createStructure(tenantId: string, dto: CreateSalaryStructureDto) {
    // Validate the employee belongs to this tenant before writing
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found in this tenant');
    }

    return this.prisma.salaryStructure.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        basicPay: dto.basicPay,
        hra: dto.hra,
        specialAllowance: dto.specialAllowance,
        standardDeductions: dto.standardDeductions,
      },
    });
  }

  async createCycle(tenantId: string, dto: CreatePayrollCycleDto) {
    return this.prisma.payrollCycle.create({
      data: {
        tenantId,
        month: dto.month,
        year: dto.year,
        status: 'DRAFT',
      },
    });
  }

  async getCycles(tenantId: string, skip = 0, take = 50) {
    return this.prisma.payrollCycle.findMany({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip,
      // `take` is client-supplied; cap it like the other list endpoints.
      take: Math.min(take, 200),
    });
  }

  async getPayslips(
    tenantId: string,
    payrollCycleId: string,
    skip?: number,
    take?: number,
  ) {
    return this.prisma.payslip.findMany({
      where: {
        tenantId,
        payrollCycleId,
      },
      include: {
        employee: true,
      },
      skip,
      take,
    });
  }

  async generatePayslip(
    tenantId: string,
    employeeId: string,
    payrollCycleId: string,
  ) {
    // Enqueue job for background processing
    const job = await this.payrollQueue.add('generate-payslip', {
      tenantId,
      employeeId,
      payrollCycleId,
    });

    this.logger.log(
      `Enqueued payroll generation job ${job.id} for employee ${employeeId}`,
    );

    return {
      message: 'Payslip generation enqueued',
      jobId: job.id,
    };
  }
}
