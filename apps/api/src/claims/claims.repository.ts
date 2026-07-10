import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaRepository, IPrismaService } from '@pingforce-monorepo/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClaimsRepository extends PrismaRepository<
  any,
  any,
  any,
  Prisma.ExpenseClaimDelegate<any>
> {
  constructor(
    @Inject('IPrismaService') private readonly prismaClient: IPrismaService,
  ) {
    super(prismaClient.expenseClaim);
  }

  async listPendingClaims(
    tenantId: string,
    skip?: number,
    take?: number,
  ): Promise<any[]> {
    return this.delegate.findMany({
      where: {
        tenantId,
        status: 'PENDING',
      },
      include: {
        expenseCategory: true,
      },
      skip,
      take,
    });
  }

  async processClaim(
    tenantId: string,
    claimId: string,
    approverId: string,
    status: string,
    notes?: string,
  ) {
    return this.prismaClient.$transaction(async (tx: any) => {
      const claim = await tx.expenseClaim.findUnique({
        where: { id: claimId, tenantId },
      });

      if (!claim) throw new NotFoundException('Expense claim not found');
      if (claim.status !== 'PENDING') {
        throw new BadRequestException(
          `Claim cannot be processed because it is currently ${claim.status}`,
        );
      }

      const updatedClaim = await tx.expenseClaim.update({
        where: { id: claimId },
        data: { status },
      });

      await tx.claimTimeline.create({
        data: {
          tenantId,
          expenseClaimId: claimId,
          status,
          createdBy: approverId,
          notes: notes || `Claim automatically marked as ${status}`,
        },
      });

      return updatedClaim;
    });
  }
}
