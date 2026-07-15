import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { ClaimsRepository } from './claims.repository';
import { CreateClaimDto } from './dto/create-claim.dto';
import { RbacService } from '../rbac/rbac.service';
import { ApprovalsService } from '../approvals/approvals.service';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly claimsRepository: ClaimsRepository,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly rbacService: RbacService,
    private readonly approvalsService: ApprovalsService,
  ) {}

  async submitClaim(tenantId: string, userId: string, dto: CreateClaimDto) {
    // Resolve the caller's own employee record — claims are always filed as self
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException(
        'No employee record is linked to this user account',
      );
    }

    return this.claimsRepository.create(tenantId, {
      employeeId: employee.id,
      expenseCategoryId: dto.expenseCategoryId,
      amount: dto.amount,
      date: new Date(dto.date),
      receiptUrl: dto.receiptUrl,
      status: 'PENDING',
    });
  }

  async listPendingClaims(
    tenantId: string,
    requesterUserId: string,
    skip?: number,
    take?: number,
  ) {
    // Data scope (DataScope.md): restrict the approval queue to the caller's
    // visibility — ALL for tenant admins, TEAM for managers.
    const scope = await this.rbacService.getDataScope(
      requesterUserId,
      'CLAIMS',
      'READ',
    );
    const scopeFilter = await this.rbacService.buildEmployeeScopeFilter(
      tenantId,
      requesterUserId,
      scope,
    );
    if (scopeFilter === null) return [];

    return this.claimsRepository.listPendingClaims(
      tenantId,
      scopeFilter,
      skip,
      take,
    );
  }

  async processClaim(
    tenantId: string,
    claimId: string,
    approverId: string,
    status: string,
    notes?: string,
  ) {
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new BadRequestException('Invalid status transition');
    }

    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id: claimId, tenantId },
      select: { employeeId: true },
    });

    if (!claim) {
      throw new NotFoundException('Expense claim not found');
    }

    // Shared approval engine (ApprovalWorkflow.md): RBAC + scope checks,
    // self-approval block, audited decision.
    return this.approvalsService.process(
      {
        tenantId,
        module: 'CLAIMS',
        entityName: 'expense_claim',
        entityId: claimId,
        ownerEmployeeId: claim.employeeId,
        actorUserId: approverId,
        decision: status,
        notes,
      },
      () =>
        this.claimsRepository.processClaim(
          tenantId,
          claimId,
          approverId,
          status,
          notes,
        ),
    );
  }
}
