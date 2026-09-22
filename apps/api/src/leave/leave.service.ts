import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { LeaveRequest } from '@prisma/client';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { RbacService } from '../rbac/rbac.service';
import {
  ApprovalsService,
  ApprovalOutcome,
} from '../approvals/approvals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InAppNotificationService } from '../notifications/in-app-notification.service';
import {
  LeaveRepository,
  LeaveTransactionRepository,
} from './leave.repository';
import { calculateLeaveDays, calendarPolicy } from './leave-calendar';
import { WorkflowEngineService } from '../approvals/workflow-engine.service';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);
  constructor(
    private readonly repository: LeaveRepository,
    private readonly rbacService: RbacService,
    private readonly approvalsService: ApprovalsService,
    private readonly notifications: NotificationsService,
    private readonly inApp: InAppNotificationService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  private async employee(
    repo: LeaveTransactionRepository,
    tenantId: string,
    userId: string,
  ): Promise<string> {
    const employee = await repo.employee(tenantId, userId);
    if (!employee)
      throw new NotFoundException(
        'No employee record is linked to this user account',
      );
    return employee.id;
  }

  async preview(
    tenantId: string,
    dto: CreateLeaveRequestDto,
  ): Promise<{ requestedDays: number }> {
    const repo = this.repository.read();
    if (!(await repo.type(tenantId, dto.leaveTypeId)))
      throw new NotFoundException('Leave type not found');
    return {
      requestedDays: calculateLeaveDays(
        dto,
        calendarPolicy((await repo.settings(tenantId))?.metadata),
      ),
    };
  }

  async requestLeave(
    tenantId: string,
    userId: string,
    dto: CreateLeaveRequestDto,
    requestId?: string,
  ): Promise<LeaveRequest> {
    const result = await this.repository.transaction(async (repo) => {
      const employeeId = await this.employee(repo, tenantId, userId);
      if (!(await repo.type(tenantId, dto.leaveTypeId)))
        throw new NotFoundException('Leave type not found');
      const days = calculateLeaveDays(
        dto,
        calendarPolicy((await repo.settings(tenantId))?.metadata),
      );
      const startDate = new Date(dto.startDate + 'T00:00:00Z');
      const endDate = new Date(dto.endDate + 'T00:00:00Z');
      const duration = dto.duration ?? 'FULL_DAY';
      const overlaps = await repo.overlapping(
        tenantId,
        employeeId,
        startDate,
        endDate,
      );
      if (
        overlaps.some(
          (r) =>
            duration === 'FULL_DAY' ||
            r.duration === 'FULL_DAY' ||
            r.duration === duration,
        )
      ) {
        throw new ConflictException(
          'Leave request overlaps with an existing request',
        );
      }
      const balance = await repo.balance(
        tenantId,
        employeeId,
        dto.leaveTypeId,
        startDate.getUTCFullYear(),
      );
      if (!balance || balance.availableDays < days)
        throw new ConflictException(
          'Insufficient leave balance for the requested dates',
        );
      await repo.changeBalance(tenantId, balance.id, {
        reservedDays: { increment: days },
        availableDays: { decrement: days },
        updatedBy: userId,
      });
      const leave = await repo.create({
        tenantId,
        employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        duration,
        requestedDays: days,
        reason: dto.reason,
        createdBy: userId,
        updatedBy: userId,
      });
      await this.record(repo, leave, 'RESERVED', userId, requestId);
      const workflow = await this.workflowEngine.findActiveWorkflow(
        tenantId,
        'LEAVES',
        'leave_request',
        { leaveTypeId: leave.leaveTypeId, days },
        repo.client,
      );
      const instance = workflow
        ? await this.workflowEngine.getOrCreateInstance(
            workflow,
            leave.id,
            employeeId,
            { leaveTypeId: leave.leaveTypeId, days },
            repo.client,
          )
        : null;
      return { leave, instance };
    });
    await this.notifyReviewer(
      result.leave,
      requestId,
      result.instance?.id,
      result.instance?.currentStage,
    );
    return result.leave;
  }

  async getLeaveTypes(
    tenantId: string,
  ): ReturnType<LeaveTransactionRepository['types']> {
    return this.repository.read().types(tenantId);
  }

  async access(userId: string): Promise<{ canApprove: boolean }> {
    return {
      canApprove: await this.rbacService.hasPermission(
        userId,
        'LEAVES',
        'APPROVE',
      ),
    };
  }

  async getMyBalances(
    tenantId: string,
    userId: string,
    year: number,
  ): ReturnType<LeaveTransactionRepository['balances']> {
    const repo = this.repository.read();
    return repo.balances(
      tenantId,
      await this.employee(repo, tenantId, userId),
      year,
    );
  }

  async getLeaveBalances(
    tenantId: string,
    userId: string,
    employeeId: string,
    year: number,
  ): ReturnType<LeaveTransactionRepository['balances']> {
    const repo = this.repository.read();
    if ((await this.employee(repo, tenantId, userId)) !== employeeId)
      throw new ForbiddenException('You may only read your own leave balance');
    return repo.balances(tenantId, employeeId, year);
  }

  async getMyRequests(
    tenantId: string,
    userId: string,
    status?: string,
    skip = 0,
    take = 25,
  ): ReturnType<LeaveTransactionRepository['list']> {
    const repo = this.repository.read();
    return repo.list(
      tenantId,
      {
        employeeId: await this.employee(repo, tenantId, userId),
        ...(status ? { status } : {}),
      },
      skip,
      Math.min(take, 100),
    );
  }

  async getPendingLeaves(
    tenantId: string,
    userId: string,
    query: LeaveQueryDto = new LeaveQueryDto(),
  ): ReturnType<LeaveTransactionRepository['list']> {
    const scope = await this.rbacService.getDataScope(userId, 'LEAVES', 'READ');
    const filter = await this.rbacService.buildEmployeeScopeFilter(
      tenantId,
      userId,
      scope,
      'LEAVES',
    );
    if (filter === null) return [];
    return this.repository
      .read()
      .list(
        tenantId,
        { ...filter, status: query.status ?? 'PENDING' },
        query.skip,
        query.take,
      );
  }

  async updateLeaveStatus(
    tenantId: string,
    leaveId: string,
    status: 'APPROVED' | 'REJECTED',
    userId: string,
    reason?: string,
    requestId?: string,
  ): Promise<
    | LeaveRequest
    | {
        id: string;
        status: string;
        workflow: Omit<ApprovalOutcome<LeaveRequest>, 'result'>;
      }
  > {
    const outcome = await this.repository.transaction(async (repo) => {
      const leave = await repo.request(tenantId, leaveId);
      if (!leave) throw new NotFoundException('Leave request not found');
      if (leave.status !== 'PENDING')
        throw new ConflictException(
          'Only pending leave requests can be decided',
        );
      const approver = await repo.employee(tenantId, userId);
      return this.approvalsService.process(
        {
          tenantId,
          module: 'LEAVES',
          entityName: 'leave_request',
          entityId: leaveId,
          ownerEmployeeId: leave.employeeId,
          actorUserId: userId,
          decision: status,
          notes: reason,
          requestId,
          context: {
            leaveTypeId: leave.leaveTypeId,
            days: leave.requestedDays,
          },
        },
        async () => {
          const balance = await repo.balance(
            tenantId,
            leave.employeeId,
            leave.leaveTypeId,
            leave.startDate.getUTCFullYear(),
          );
          if (!balance || balance.reservedDays < leave.requestedDays)
            throw new ConflictException(
              'Leave balance requires administrator reconciliation',
            );
          const claimed = await repo.update(tenantId, leaveId, 'PENDING', {
            status,
            approvedBy: approver?.id ?? null,
            approvedAt: new Date(),
            decisionReason: reason,
            updatedBy: userId,
          });
          if (claimed.count !== 1)
            throw new ConflictException(
              'Leave request has already changed; refresh and retry',
            );
          await repo.changeBalance(tenantId, balance.id, {
            reservedDays: { decrement: leave.requestedDays },
            ...(status === 'APPROVED'
              ? { usedDays: { increment: leave.requestedDays } }
              : { availableDays: { increment: leave.requestedDays } }),
            updatedBy: userId,
          });
          const updated = await repo.request(tenantId, leaveId);
          if (!updated) throw new NotFoundException('Leave request not found');
          await this.record(repo, updated, status, userId, requestId);
          return updated;
        },
        repo.client,
      );
    });
    if (!outcome.finalized || !outcome.result) {
      const leave = await this.repository.read().request(tenantId, leaveId);
      if (leave)
        await this.notifyReviewer(
          leave,
          requestId,
          outcome.instanceId,
          outcome.nextStageNumber,
        );
      return { id: leaveId, status: 'PENDING', workflow: outcome };
    }
    await this.notify(outcome.result, requestId);
    return outcome.result;
  }

  async withdraw(
    tenantId: string,
    userId: string,
    id: string,
    requestId?: string,
  ): Promise<LeaveRequest> {
    return this.cancel(
      tenantId,
      userId,
      id,
      false,
      'Withdrawn by employee',
      requestId,
    );
  }

  async cancelApproved(
    tenantId: string,
    userId: string,
    id: string,
    reason: string,
    requestId?: string,
  ): Promise<LeaveRequest> {
    return this.cancel(tenantId, userId, id, true, reason, requestId);
  }

  private async cancel(
    tenantId: string,
    userId: string,
    id: string,
    approved: boolean,
    reason: string,
    requestId?: string,
  ): Promise<LeaveRequest> {
    const result = await this.repository.transaction(async (repo) => {
      const leave = await repo.request(tenantId, id);
      if (!leave) throw new NotFoundException('Leave request not found');
      if (approved)
        await this.approvalsService.authorizeDecision({
          tenantId,
          module: 'LEAVES',
          entityName: 'leave_request',
          entityId: id,
          ownerEmployeeId: leave.employeeId,
          actorUserId: userId,
          decision: 'REJECTED',
        });
      else if (
        (await this.employee(repo, tenantId, userId)) !== leave.employeeId
      )
        throw new NotFoundException('Leave request not found');
      if (leave.status === 'CANCELLED') return leave;
      const expected = approved ? 'APPROVED' : 'PENDING';
      if (leave.status !== expected)
        throw new ConflictException(
          'Only ' +
            expected.toLowerCase() +
            ' requests can be ' +
            (approved ? 'cancelled' : 'withdrawn'),
        );
      const balance = await repo.balance(
        tenantId,
        leave.employeeId,
        leave.leaveTypeId,
        leave.startDate.getUTCFullYear(),
      );
      if (
        !balance ||
        (approved ? balance.usedDays : balance.reservedDays) <
          leave.requestedDays
      )
        throw new ConflictException(
          'Leave balance requires administrator reconciliation',
        );
      const changed = await repo.update(tenantId, id, expected, {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        decisionReason: reason,
        updatedBy: userId,
      });
      if (changed.count !== 1)
        throw new ConflictException(
          'Leave request has already changed; refresh and retry',
        );
      await repo.changeBalance(tenantId, balance.id, {
        availableDays: { increment: leave.requestedDays },
        ...(approved
          ? { usedDays: { decrement: leave.requestedDays } }
          : { reservedDays: { decrement: leave.requestedDays } }),
        updatedBy: userId,
      });
      await repo.cancelWorkflow(tenantId, id);
      const updated = await repo.request(tenantId, id);
      if (!updated) throw new NotFoundException('Leave request not found');
      await this.record(
        repo,
        updated,
        approved ? 'CANCELLED' : 'WITHDRAWN',
        userId,
        requestId,
      );
      return updated;
    });
    await this.notify(result, requestId);
    return result;
  }

  private async record(
    repo: LeaveTransactionRepository,
    leave: LeaveRequest,
    action: string,
    userId: string,
    requestId?: string,
  ): Promise<void> {
    await repo.ledger({
      tenantId: leave.tenantId,
      requestId: leave.id,
      employeeId: leave.employeeId,
      leaveTypeId: leave.leaveTypeId,
      year: leave.startDate.getUTCFullYear(),
      action,
      days: leave.requestedDays,
      createdBy: userId,
    });
    await repo.audit({
      tenantId: leave.tenantId,
      actorId: userId,
      module: 'LEAVES',
      entityName: 'leave_request',
      entityId: leave.id,
      action: 'LEAVE_' + action,
      requestId,
      newValue: { status: leave.status, days: leave.requestedDays },
    });
  }

  private async notify(leave: LeaveRequest, requestId?: string): Promise<void> {
    try {
      const owner = await this.repository
        .read()
        .owner(leave.tenantId, leave.employeeId);
      if (!owner?.user) return;
      await this.repository.read().notificationTemplates(leave.tenantId);
      const title = 'Leave request ' + leave.status.toLowerCase();
      const body =
        'Your leave from ' +
        leave.startDate.toISOString().slice(0, 10) +
        ' to ' +
        leave.endDate.toISOString().slice(0, 10) +
        ' is ' +
        leave.status.toLowerCase() +
        '.';
      const results = await Promise.allSettled([
        this.inApp.create({
          tenantId: leave.tenantId,
          recipientId: owner.user.id,
          category: 'LEAVE',
          title,
          body,
          deepLinkRoute: '/leave',
        }),
        this.notifications.sendEmail(
          leave.tenantId,
          owner.user.id,
          'LEAVE_STATUS_EMAIL',
          {
            status: leave.status.toLowerCase(),
            startDate: leave.startDate.toISOString().slice(0, 10),
            endDate: leave.endDate.toISOString().slice(0, 10),
          },
        ),
        this.notifications.sendPush(
          leave.tenantId,
          owner.user.id,
          'LEAVE_STATUS_PUSH',
          {
            status: leave.status.toLowerCase(),
            startDate: leave.startDate.toISOString().slice(0, 10),
            endDate: leave.endDate.toISOString().slice(0, 10),
          },
        ),
      ]);
      if (results.some((r) => r.status === 'rejected'))
        throw new Error('Notification delivery failed');
    } catch {
      this.logger.warn(
        {
          tenant_id: leave.tenantId,
          request_id: requestId,
          leave_id: leave.id,
        },
        'Leave saved; notification delivery failed',
      );
    }
  }

  private async notifyReviewer(
    leave: LeaveRequest,
    requestId?: string,
    instanceId?: string,
    stageNumber?: number,
  ): Promise<void> {
    try {
      const repo = this.repository.read();
      const recipient =
        instanceId && stageNumber
          ? await repo.assignedApprover(leave.tenantId, instanceId, stageNumber)
          : await repo.reportingManager(leave.tenantId, leave.employeeId);
      if (!recipient) return;
      // Do not disclose request data to an out-of-scope reporting manager.
      await this.approvalsService.authorizeDecision({
        tenantId: leave.tenantId,
        module: 'LEAVES',
        entityName: 'leave_request',
        entityId: leave.id,
        ownerEmployeeId: leave.employeeId,
        actorUserId: recipient,
        decision: 'APPROVED',
      });
      await repo.notificationTemplates(leave.tenantId);
      await Promise.all([
        this.inApp.create({
          tenantId: leave.tenantId,
          recipientId: recipient,
          category: 'LEAVE',
          title: 'Leave request awaiting review',
          body: 'Open the Leave requests page to review your approval queue.',
          deepLinkRoute: '/leave',
        }),
        this.notifications.sendEmail(
          leave.tenantId,
          recipient,
          'LEAVE_REVIEW_EMAIL',
          {},
        ),
        this.notifications.sendPush(
          leave.tenantId,
          recipient,
          'LEAVE_REVIEW_PUSH',
          {},
        ),
      ]);
    } catch {
      this.logger.warn(
        {
          tenant_id: leave.tenantId,
          request_id: requestId,
          leave_id: leave.id,
        },
        'Reviewer notification could not be delivered',
      );
    }
  }
}
