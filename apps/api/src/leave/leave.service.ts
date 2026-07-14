import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class LeaveService {
  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService,
    private readonly rbacService: RbacService,
  ) {}

  async requestLeave(
    tenantId: string,
    userId: string,
    dto: CreateLeaveRequestDto,
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Resolve the caller's own employee record — leave is always filed as self
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException(
        'No employee record is linked to this user account',
      );
    }

    const employeeId = employee.id;

    return this.prisma.$transaction(async (tx) => {
      // Validate overlapping leaves
      const overlapping = await tx.leaveRequest.findFirst({
        where: {
          tenantId,
          employeeId,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
        },
      });

      if (overlapping) {
        throw new ConflictException(
          'Leave request overlaps with an existing request',
        );
      }

      const daysRequested =
        Math.floor(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;
      const year = startDate.getFullYear();

      const balance = await tx.leaveBalance.findUnique({
        where: {
          tenantId_employeeId_leaveTypeId_year: {
            tenantId,
            employeeId,
            leaveTypeId: dto.leaveTypeId,
            year,
          },
        },
      });

      if (!balance || balance.availableDays < daysRequested) {
        throw new ConflictException(
          'Insufficient leave balance for the requested dates',
        );
      }

      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: {
          usedDays: { increment: daysRequested },
          availableDays: { decrement: daysRequested },
        },
      });

      return tx.leaveRequest.create({
        data: {
          tenantId,
          employeeId,
          leaveTypeId: dto.leaveTypeId,
          startDate,
          endDate,
          reason: dto.reason,
        },
      });
    });
  }

  async getLeaveBalances(
    tenantId: string,
    employeeId: string,
    year: number,
    skip = 0,
    take = 50,
  ) {
    return this.prisma.leaveBalance.findMany({
      where: { tenantId, employeeId, year },
      skip,
      take,
    });
  }

  async getPendingLeaves(
    tenantId: string,
    requesterUserId: string,
    skip = 0,
    take = 50,
  ) {
    // Data scope (DataScope.md): tenant admins see all, managers see their
    // team, everyone else sees nothing they aren't scoped to.
    const scope = await this.rbacService.getDataScope(
      requesterUserId,
      'LEAVES',
      'READ',
    );
    const scopeFilter = await this.rbacService.buildEmployeeScopeFilter(
      tenantId,
      requesterUserId,
      scope,
    );
    if (scopeFilter === null) return [];

    return this.prisma.leaveRequest.findMany({
      where: { tenantId, status: 'PENDING', ...scopeFilter },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            // Never include the full user record here — it carries
            // passwordHash and tokenVersion.
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async updateLeaveStatus(
    tenantId: string,
    leaveId: string,
    status: 'APPROVED' | 'REJECTED',
    managerId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.findUnique({
        where: { id: leaveId },
      });

      if (!leave || leave.tenantId !== tenantId) {
        throw new NotFoundException('Leave request not found');
      }

      if (leave.status !== 'PENDING') {
        throw new ConflictException(
          'Can only approve/reject pending leave requests',
        );
      }

      const updatedLeave = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: { status, approvedBy: managerId },
      });

      // If rejected, refund the days to the balance
      if (status === 'REJECTED') {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);
        const daysRequested =
          Math.floor(
            (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24),
          ) + 1;
        const year = startDate.getFullYear();

        const balance = await tx.leaveBalance.findUnique({
          where: {
            tenantId_employeeId_leaveTypeId_year: {
              tenantId,
              employeeId: leave.employeeId,
              leaveTypeId: leave.leaveTypeId,
              year,
            },
          },
        });

        if (balance) {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              usedDays: { decrement: daysRequested },
              availableDays: { increment: daysRequested },
            },
          });
        }
      }

      return updatedLeave;
    });
  }
}
