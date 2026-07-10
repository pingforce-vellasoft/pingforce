import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

@Injectable()
export class LeaveService {
  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService
  ) {}

  async requestLeave(tenantId: string, dto: CreateLeaveRequestDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    
    return this.prisma.$transaction(async (tx) => {
      // Validate overlapping leaves
      const overlapping = await tx.leaveRequest.findFirst({
        where: {
          tenantId,
          employeeId: dto.employeeId,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            { startDate: { lte: endDate }, endDate: { gte: startDate } }
          ],
        },
      });

      if (overlapping) {
        throw new ConflictException('Leave request overlaps with an existing request');
      }

      const daysRequested = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const year = startDate.getFullYear();

      const balance = await tx.leaveBalance.findUnique({
        where: {
          tenantId_employeeId_leaveTypeId_year: {
            tenantId,
            employeeId: dto.employeeId,
            leaveTypeId: dto.leaveTypeId,
            year
          }
        }
      });

      if (!balance || balance.availableDays < daysRequested) {
        throw new ConflictException('Insufficient leave balance for the requested dates');
      }

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          usedDays: { increment: daysRequested },
          availableDays: { decrement: daysRequested }
        }
      });

      return tx.leaveRequest.create({
        data: {
          tenantId,
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          startDate,
          endDate,
          reason: dto.reason,
        },
      });
    });
  }

  async getLeaveBalances(tenantId: string, employeeId: string, year: number, skip = 0, take = 50) {
    return this.prisma.leaveBalance.findMany({
      where: { tenantId, employeeId, year },
      skip,
      take
    });
  }

  async getPendingLeaves(tenantId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { tenantId, status: 'PENDING' },
      include: {
        employee: {
          include: { user: true }
        },
        leaveType: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateLeaveStatus(tenantId: string, leaveId: string, status: 'APPROVED' | 'REJECTED', managerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.findUnique({
        where: { id: leaveId }
      });

      if (!leave || leave.tenantId !== tenantId) {
        throw new NotFoundException('Leave request not found');
      }

      if (leave.status !== 'PENDING') {
        throw new ConflictException('Can only approve/reject pending leave requests');
      }

      const updatedLeave = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: { status, approvedBy: managerId }
      });

      // If rejected, refund the days to the balance
      if (status === 'REJECTED') {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const daysRequested = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;
        const year = startDate.getFullYear();

        const balance = await tx.leaveBalance.findUnique({
          where: {
            tenantId_employeeId_leaveTypeId_year: {
              tenantId,
              employeeId: leave.employeeId,
              leaveTypeId: leave.leaveTypeId,
              year
            }
          }
        });

        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: { decrement: daysRequested },
              availableDays: { increment: daysRequested }
            }
          });
        }
      }

      return updatedLeave;
    });
  }
}
