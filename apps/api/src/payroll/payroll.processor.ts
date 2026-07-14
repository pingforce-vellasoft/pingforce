import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject, Logger } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

@Processor('payroll')
export class PayrollProcessor {
  private readonly logger = new Logger(PayrollProcessor.name);

  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService,
  ) {}

  @Process('generate-payslip')
  async handleGeneratePayslip(
    job: Job<{ tenantId: string; employeeId: string; payrollCycleId: string }>,
  ) {
    const { tenantId, employeeId, payrollCycleId } = job.data;
    this.logger.debug(
      `Processing payroll generation for employee ${employeeId}`,
    );
    try {
      // 1. Fetch Cycle
      const cycle = await this.prisma.payrollCycle.findUnique({
        where: { id: payrollCycleId, tenantId },
      });
      if (!cycle) throw new Error('Payroll cycle not found');

      // 2. Fetch Salary Structure
      const structure = await this.prisma.salaryStructure.findFirst({
        where: { employeeId, tenantId },
      });
      if (!structure)
        throw new Error('Salary structure not found for employee');

      // 3. Fetch Attendance for the cycle's month/year
      const startDate = new Date(Date.UTC(cycle.year, cycle.month - 1, 1));
      const endDate = new Date(
        Date.UTC(cycle.year, cycle.month, 0, 23, 59, 59),
      );

      const presentDaysCount = await this.prisma.attendance.count({
        where: {
          tenantId,
          employeeId,
          attendanceDate: { gte: startDate, lte: endDate },
          status: 'PRESENT',
        },
      });

      // Calculate paid leave days within this cycle
      const paidLeaves = await this.prisma.leaveRequest.findMany({
        where: {
          tenantId,
          employeeId,
          status: 'APPROVED',
          leaveType: { isPaid: true },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });

      let paidLeaveDays = 0;
      for (const leave of paidLeaves) {
        const leaveStart =
          leave.startDate > startDate ? leave.startDate : startDate;
        const leaveEnd = leave.endDate < endDate ? leave.endDate : endDate;
        // +1 to include both start and end days
        const days =
          Math.floor(
            (leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24),
          ) + 1;
        paidLeaveDays += Math.max(0, days);
      }

      // 4. Payroll Calculation Logic (Assuming 22 working days)
      const EXPECTED_DAYS = 22;
      const totalValidDays = presentDaysCount + paidLeaveDays;
      const lwp = Math.max(0, EXPECTED_DAYS - totalValidDays);

      // Convert Decimal to Number for calculation
      const basicPay = Number(structure.basicPay);
      const hra = Number(structure.hra);
      const specialAllowance = Number(structure.specialAllowance);
      const standardDeductions = Number(structure.standardDeductions);

      const round2 = (n: number) => Math.round(n * 100) / 100;

      const grossPay = round2(basicPay + hra + specialAllowance);
      const lwpDeduction = (basicPay / EXPECTED_DAYS) * lwp;

      const totalDeductions = round2(standardDeductions + lwpDeduction);
      const netPay = round2(Math.max(0, grossPay - totalDeductions));

      // 5. Create Payslip
      await this.prisma.payslip.create({
        data: {
          tenantId,
          employeeId,
          payrollCycleId,
          grossPay,
          totalDeductions,
          netPay,
          status: 'DRAFT',
        },
      });
      this.logger.debug(
        `Payslip generation for employee ${employeeId} completed.`,
      );
    } catch (error) {
      this.logger.error(
        `Error generating payslip for employee ${employeeId}:`,
        error,
      );
      throw error;
    }
  }
}
