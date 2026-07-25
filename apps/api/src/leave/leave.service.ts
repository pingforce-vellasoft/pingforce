import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { RbacService } from '../rbac/rbac.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InAppNotificationService } from '../notifications/in-app-notification.service';

@Injectable()
export class LeaveService {
  constructor(
    @Inject('IPrismaService')
    private readonly prisma: IPrismaService,
    private readonly rbacService: RbacService,
    private readonly approvalsService: ApprovalsService,
    private readonly notifications: NotificationsService,
    private readonly inApp: InAppNotificationService,
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
          // A withdrawn/deleted request must not block a new one for the
          // same dates.
          deletedAt: null,
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
      where: { tenantId, employeeId, year, deletedAt: null },
      skip,
      // `take` is client-supplied; cap it like the other list endpoints.
      take: Math.min(take, 200),
    });
  }

  /**
   * Active leave types for the tenant — used to populate the Apply form.
   * The client needs the real leaveTypeId (not a hard-coded enum) to file.
   */
  async getLeaveTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        isPaid: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Resolve the caller's own employee id. Self-service leave endpoints derive
   * the employee from the JWT so a client can never read or file for someone
   * else (closes the balance/:employeeId scope hole).
   */
  private async resolveEmployeeId(
    tenantId: string,
    userId: string,
  ): Promise<string> {
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException(
        'No employee record is linked to this user account',
      );
    }
    return employee.id;
  }

  /** The caller's own leave balances for a year, with the type joined in. */
  async getMyBalances(tenantId: string, userId: string, year: number) {
    const employeeId = await this.resolveEmployeeId(tenantId, userId);
    return this.prisma.leaveBalance.findMany({
      where: { tenantId, employeeId, year, deletedAt: null },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
      },
      orderBy: { leaveType: { name: 'asc' } },
    });
  }

  /** The caller's own leave requests (history), newest first. */
  async getMyRequests(
    tenantId: string,
    userId: string,
    status?: string,
    skip = 0,
    take = 50,
  ) {
    const employeeId = await this.resolveEmployeeId(tenantId, userId);
    return this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(take, 100),
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
      'LEAVES',
    );
    if (scopeFilter === null) return [];

    return this.prisma.leaveRequest.findMany({
      where: { tenantId, status: 'PENDING', deletedAt: null, ...scopeFilter },
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
    // Approval routing via the shared workflow engine (ApprovalWorkflow.md):
    // RBAC + data-scope authorization, self-approval block, audit trail.
    // Tenants with an active leave_request workflow route through its
    // stages; the leave record only changes on the finalizing decision.
    const pending = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveId, tenantId, deletedAt: null },
      select: {
        employeeId: true,
        leaveTypeId: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!pending) {
      throw new NotFoundException('Leave request not found');
    }

    const requestedDays =
      Math.floor(
        (new Date(pending.endDate).getTime() -
          new Date(pending.startDate).getTime()) /
          (1000 * 3600 * 24),
      ) + 1;

    const applyDecision = () =>
      this.prisma.$transaction(async (tx) => {
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

    const outcome = await this.approvalsService.process(
      {
        tenantId,
        module: 'LEAVES',
        entityName: 'leave_request',
        entityId: leaveId,
        ownerEmployeeId: pending.employeeId,
        actorUserId: managerId,
        decision: status,
        context: { leaveTypeId: pending.leaveTypeId, days: requestedDays },
      },
      applyDecision,
    );

    // Intermediate stage approval — leave stays PENDING for the next
    // approver; no balance change, no employee notification yet.
    if (!outcome.finalized || !outcome.result) {
      return {
        id: leaveId,
        status: 'PENDING',
        workflow: {
          instanceId: outcome.instanceId,
          approvedStage: outcome.stageNumber,
          nextStage: outcome.nextStageNumber,
          nextStageName: outcome.nextStageName,
          totalStages: outcome.totalStages,
        },
      };
    }
    const decided = outcome.result;

    // Notify the employee (ApprovalWorkflow.md — notification on decision)
    const owner = await this.prisma.employee.findFirst({
      where: { id: pending.employeeId, tenantId, deletedAt: null },
      select: {
        firstName: true,
        user: { select: { id: true, email: true } },
      },
    });
    const verb = status === 'APPROVED' ? 'approved' : 'rejected';
    if (owner?.user?.email) {
      void this.notifications.sendRawEmail(
        owner.user.email,
        `Your leave request has been ${verb}`,
        `<p>Hi ${owner.firstName},</p>
         <p>Your leave request from ${decided.startDate.toDateString()} to ${decided.endDate.toDateString()} has been <b>${verb}</b>.</p>`,
      );
    }
    // In-app feed (mobile Home bell) — mirror the email decision.
    if (owner?.user?.id) {
      await this.inApp.create({
        tenantId,
        recipientId: owner.user.id,
        category: 'LEAVE',
        title: `Leave request ${verb}`,
        body: `Your leave from ${decided.startDate.toDateString()} to ${decided.endDate.toDateString()} was ${verb}.`,
        deepLinkRoute: '/leave',
      });
    }

    return decided;
  }
}
