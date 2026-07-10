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

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService,
    @InjectQueue('payroll') private payrollQueue: Queue,
  ) {}

  async createStructure(tenantId: string, data: any) {
    return this.prisma.salaryStructure.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async createCycle(tenantId: string, data: any) {
    return this.prisma.payrollCycle.create({
      data: {
        ...data,
        tenantId,
        status: 'DRAFT',
      },
    });
  }

  async getCycles(tenantId: string, skip = 0, take = 50) {
    return this.prisma.payrollCycle.findMany({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip,
      take,
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
