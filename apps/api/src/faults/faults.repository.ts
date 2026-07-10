import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaRepository, IPrismaService } from '@pingforce-monorepo/shared';
import { FaultStatus } from './dto/update-fault-status.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FaultsRepository extends PrismaRepository<
  any,
  any,
  any,
  Prisma.FaultDelegate<any>
> {
  constructor(
    @Inject('IPrismaService') private readonly prismaService: IPrismaService,
  ) {
    super(prismaService.fault);
  }

  override async findAll(
    tenantId: string,
    skip?: number,
    take?: number,
  ): Promise<any[]> {
    return this.delegate.findMany({
      where: { tenantId },
      include: {
        customer: true,
        assignedToUser: true,
      },
      skip,
      take,
    });
  }

  async findAssignedToMe(
    tenantId: string,
    userId: string,
    skip?: number,
    take?: number,
  ) {
    return this.delegate.findMany({
      where: { tenantId, assignedToId: userId },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });
  }

  override async findById(tenantId: string, id: string): Promise<any | null> {
    const fault = await this.delegate.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        assignedToUser: true,
        faultTimelines: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return fault || null;
  }

  async findBreached(tenantId: string, skip?: number, take?: number) {
    return this.delegate.findMany({
      where: {
        tenantId,
        slaDeadline: { lt: new Date() },
        status: { notIn: [FaultStatus.RESOLVED, FaultStatus.CLOSED] },
      },
      include: {
        assignedToUser: true,
      },
      orderBy: {
        slaDeadline: 'asc',
      },
      skip,
      take,
    });
  }

  async createFaultWithTimeline(
    tenantId: string,
    userId: string,
    data: any,
    slaDeadline: Date | null,
  ) {
    return this.prismaService.$transaction(async (tx: any) => {
      const fault = await tx.fault.create({
        data: {
          tenantId,
          createdBy: userId,
          slaDeadline,
          ...data,
        },
      });

      await tx.faultTimeline.create({
        data: {
          tenantId,
          faultId: fault.id,
          status: fault.status,
          notes: 'Fault created',
          createdBy: userId,
        },
      });
      return fault;
    });
  }

  async updateFault(
    tenantId: string,
    id: string,
    userId: string,
    data: any,
    slaDeadline: Date | undefined,
  ) {
    return this.prismaService.$transaction(async (tx: any) => {
      return tx.fault.update({
        where: { id_tenantId: { id, tenantId } },
        data: {
          ...data,
          ...(slaDeadline !== undefined && { slaDeadline }),
          updatedBy: userId,
        },
      });
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    userId: string,
    status: string,
    notes: string,
  ) {
    return this.prismaService.$transaction(async (tx: any) => {
      const fault = await tx.fault.findFirst({ where: { id, tenantId } });
      if (!fault) throw new NotFoundException(`Fault with ID ${id} not found`);
      if (fault.status === FaultStatus.CLOSED)
        throw new BadRequestException('Cannot update a closed fault');

      const updatedFault = await tx.fault.update({
        where: { id_tenantId: { id, tenantId } },
        data: { status, updatedBy: userId },
      });

      await tx.faultTimeline.create({
        data: {
          tenantId,
          faultId: updatedFault.id,
          status,
          notes,
          createdBy: userId,
        },
      });

      return updatedFault;
    });
  }

  async escalateFault(
    tenantId: string,
    id: string,
    userId: string,
    escalateToId?: string,
  ) {
    return this.prismaService.$transaction(async (tx: any) => {
      const fault = await tx.fault.findUnique({
        where: { id_tenantId: { id, tenantId } },
      });
      if (!fault) throw new NotFoundException(`Fault with ID ${id} not found`);
      if (
        fault.status === FaultStatus.CLOSED ||
        fault.status === FaultStatus.RESOLVED
      ) {
        throw new BadRequestException(
          'Cannot escalate a resolved or closed fault',
        );
      }

      const escalatedFault = await tx.fault.update({
        where: { id_tenantId: { id, tenantId } },
        data: {
          escalationLevel: { increment: 1 },
          isEscalated: true,
          ...(escalateToId && { assignedToId: escalateToId }),
          updatedBy: userId,
        },
      });

      await tx.faultTimeline.create({
        data: {
          tenantId,
          faultId: escalatedFault.id,
          status: escalatedFault.status,
          notes: `Fault escalated to level ${escalatedFault.escalationLevel}`,
          createdBy: userId,
        },
      });

      return escalatedFault;
    });
  }
}
