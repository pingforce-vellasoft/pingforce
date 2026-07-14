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

@Injectable()
export class ClaimsService {
  constructor(
    private readonly claimsRepository: ClaimsRepository,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly rbacService: RbacService,
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

    // Block self-approval: an approver may not process their own claim
    const approverEmployee = await this.prisma.employee.findFirst({
      where: { tenantId, userId: approverId, deletedAt: null },
      select: { id: true },
    });

    const claim = await this.prisma.expenseClaim.findFirst({
      where: { id: claimId, tenantId },
      select: { employeeId: true },
    });

    if (!claim) {
      throw new NotFoundException('Expense claim not found');
    }

    if (approverEmployee && claim.employeeId === approverEmployee.id) {
      throw new ForbiddenException('You cannot approve your own claim');
    }

    return this.claimsRepository.processClaim(
      tenantId,
      claimId,
      approverId,
      status,
      notes,
    );
  }
}
