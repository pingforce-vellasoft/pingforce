import { Inject, Injectable } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import {
  Prisma,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveLedger,
  AuditLog,
} from '@prisma/client';
import { LEAVE_NOTIFICATION_TEMPLATES } from '../notifications/default-templates';

type TypeSummary = Pick<LeaveType, 'id' | 'name' | 'code'>;
type ListedLeave = LeaveRequest & {
  leaveType: TypeSummary;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
};

@Injectable()
export class LeaveRepository {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  async transaction<T>(
    work: (repository: LeaveTransactionRepository) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          (tx) => work(new LeaveTransactionRepository(tx)),
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 15000,
          },
        );
      } catch (error) {
        if (
          attempt >= 2 ||
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034'
        )
          throw error;
      }
    }
  }

  read(): LeaveTransactionRepository {
    return new LeaveTransactionRepository(this.prisma);
  }
}

export class LeaveTransactionRepository {
  constructor(readonly client: Prisma.TransactionClient) {}

  async notificationTemplates(tenantId: string): Promise<void> {
    await this.client.notificationTemplate.createMany({
      data: LEAVE_NOTIFICATION_TEMPLATES.map((template) => ({
        ...template,
        tenantId,
        status: 'ACTIVE',
      })),
      skipDuplicates: true,
    });
  }

  async reportingManager(
    tenantId: string,
    employeeId: string,
  ): Promise<string | null> {
    const employee = await this.client.employee.findFirst({
      where: { tenantId, id: employeeId, deletedAt: null },
      select: { reportingManagerId: true },
    });
    if (!employee?.reportingManagerId) return null;
    const manager = await this.client.employee.findFirst({
      where: { tenantId, id: employee.reportingManagerId, deletedAt: null },
      select: { userId: true },
    });
    return manager?.userId ?? null;
  }

  async assignedApprover(
    tenantId: string,
    instanceId: string,
    stageNumber: number,
  ): Promise<string | null> {
    const instance = await this.client.workflowInstance.findFirst({
      where: { tenantId, id: instanceId, status: 'IN_PROGRESS' },
      select: { workflowId: true },
    });
    if (!instance) return null;
    const stage = await this.client.workflowStage.findFirst({
      where: { tenantId, workflowId: instance.workflowId, stageNumber },
      select: { approverUserId: true },
    });
    return stage?.approverUserId ?? null;
  }

  async employee(
    tenantId: string,
    userId: string,
  ): Promise<{ id: string } | null> {
    return this.client.employee.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true },
    });
  }
  async owner(
    tenantId: string,
    employeeId: string,
  ): Promise<{ user: { id: string; email: string | null } | null } | null> {
    return this.client.employee.findFirst({
      where: { tenantId, id: employeeId, deletedAt: null },
      select: { user: { select: { id: true, email: true } } },
    });
  }
  async settings(
    tenantId: string,
  ): Promise<{ metadata: Prisma.JsonValue } | null> {
    return this.client.tenantSetting.findUnique({
      where: { tenantId },
      select: { metadata: true },
    });
  }
  async type(tenantId: string, id: string): Promise<LeaveType | null> {
    return this.client.leaveType.findFirst({
      where: { tenantId, id, deletedAt: null },
    });
  }
  async types(
    tenantId: string,
  ): Promise<(TypeSummary & { isPaid: boolean })[]> {
    return this.client.leaveType.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true, code: true, isPaid: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }
  async balances(
    tenantId: string,
    employeeId: string,
    year: number,
  ): Promise<(LeaveBalance & { leaveType: TypeSummary })[]> {
    return this.client.leaveBalance.findMany({
      where: {
        tenantId,
        employeeId,
        year,
        deletedAt: null,
        leaveType: { tenantId, deletedAt: null },
      },
      include: { leaveType: { select: { id: true, name: true, code: true } } },
      orderBy: { leaveType: { name: 'asc' } },
      take: 100,
    });
  }
  async balance(
    tenantId: string,
    employeeId: string,
    leaveTypeId: string,
    year: number,
  ): Promise<LeaveBalance | null> {
    return this.client.leaveBalance.findFirst({
      where: { tenantId, employeeId, leaveTypeId, year, deletedAt: null },
    });
  }
  async changeBalance(
    tenantId: string,
    id: string,
    data: Prisma.LeaveBalanceUpdateManyMutationInput,
  ): Promise<Prisma.BatchPayload> {
    return this.client.leaveBalance.updateMany({
      where: { tenantId, id, deletedAt: null },
      data,
    });
  }
  async request(tenantId: string, id: string): Promise<LeaveRequest | null> {
    return this.client.leaveRequest.findFirst({
      where: { tenantId, id, deletedAt: null },
    });
  }
  async overlapping(
    tenantId: string,
    employeeId: string,
    start: Date,
    end: Date,
  ): Promise<LeaveRequest[]> {
    return this.client.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId,
        deletedAt: null,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
  }
  async list(
    tenantId: string,
    filter: Prisma.LeaveRequestWhereInput,
    skip: number,
    take: number,
  ): Promise<ListedLeave[]> {
    return this.client.leaveRequest.findMany({
      where: { AND: [{ tenantId, deletedAt: null }, filter] },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    });
  }
  async create(
    data: Prisma.LeaveRequestUncheckedCreateInput,
  ): Promise<LeaveRequest> {
    return this.client.leaveRequest.create({ data });
  }
  async update(
    tenantId: string,
    id: string,
    status: string,
    data: Prisma.LeaveRequestUncheckedUpdateManyInput,
  ): Promise<Prisma.BatchPayload> {
    return this.client.leaveRequest.updateMany({
      where: { tenantId, id, status, deletedAt: null },
      data,
    });
  }
  async ledger(
    data: Prisma.LeaveLedgerUncheckedCreateInput,
  ): Promise<LeaveLedger> {
    return this.client.leaveLedger.create({ data });
  }
  async audit(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
    return this.client.auditLog.create({ data });
  }
  async cancelWorkflow(tenantId: string, entityId: string): Promise<void> {
    await this.client.workflowInstance.updateMany({
      where: {
        tenantId,
        entityName: 'leave_request',
        entityId,
        status: 'IN_PROGRESS',
      },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }
}
