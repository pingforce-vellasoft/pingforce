import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService, CurrentUserContext } from '@pingforce-monorepo/shared';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { TopologyService, ImpactResult } from './topology.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { MoveConnectionDto } from './dto/move-connection.dto';
import { SplitConnectionDto } from './dto/split-connection.dto';
import { MergeConnectionDto } from './dto/merge-connection.dto';

const CUSTOMER_SUMMARY_SELECT = {
  select: {
    id: true,
    customerCode: true,
    displayName: true,
    legalName: true,
    status: true,
    primaryMobile: true,
  },
} as const;

type Tx = Prisma.TransactionClient;

interface HistoryEntry {
  readonly connectionId: string;
  readonly action: string;
  readonly previousParent?: string | null;
  readonly newParent?: string | null;
  readonly previousOlte?: string | null;
  readonly newOlte?: string | null;
  readonly previousStatus?: string | null;
  readonly newStatus?: string | null;
  readonly details?: Prisma.InputJsonValue;
}

@Injectable()
export class ConnectionService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly topology: TopologyService,
    private readonly auditService: AuditService,
  ) {}

  private async writeHistory(
    tx: Tx,
    tenantId: string,
    performedBy: string,
    entry: HistoryEntry,
  ): Promise<void> {
    await tx.connectionHistory.create({
      data: { tenantId, performedBy, ...entry },
    });
  }

  private audit(
    tenantId: string,
    currentUser: CurrentUserContext,
    entityId: string,
    action: string,
    oldValue?: unknown,
    newValue?: unknown,
  ): void {
    void this.auditService.log({
      tenantId,
      actorId: currentUser.userId,
      module: 'NETWORK',
      entityName: 'NetworkConnection',
      entityId,
      action,
      oldValue,
      newValue,
    });
  }

  async create(
    tenantId: string,
    currentUser: CurrentUserContext,
    dto: CreateConnectionDto,
  ): Promise<unknown> {
    const olte = await this.prisma.olte.findFirst({
      where: { id: dto.olteId, tenantId, deletedAt: null },
    });
    if (!olte) {
      throw new NotFoundException(`OLTE with ID ${dto.olteId} not found`);
    }

    let parent = null;
    if (dto.parentConnectionId) {
      parent = await this.topology.getNode(tenantId, dto.parentConnectionId);
      if (parent.olteId !== dto.olteId) {
        throw new BadRequestException(
          'Parent connection belongs to a different OLTE',
        );
      }
    } else if (olte.totalPorts > 0 && olte.usedPorts >= olte.totalPorts) {
      throw new BadRequestException(
        `OLTE ${olte.code} has no available ports (${olte.usedPorts}/${olte.totalPorts} used)`,
      );
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId, deletedAt: null },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${dto.customerId} not found`,
        );
      }
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const { installationDate, ...rest } = dto;
        const connection = await tx.networkConnection.create({
          data: {
            ...rest,
            installationDate: installationDate
              ? new Date(installationDate)
              : undefined,
            tenantId,
            depth: parent ? parent.depth + 1 : 0,
            path: 'pending', // needs own id — patched below in the same tx
            createdBy: currentUser.userId,
          },
        });
        const path = this.topology.buildPath(parent, connection.id);
        const withPath = await tx.networkConnection.update({
          where: { id_tenantId: { id: connection.id, tenantId } },
          data: { path },
        });
        await this.writeHistory(tx, tenantId, currentUser.userId, {
          connectionId: connection.id,
          action: 'CREATED',
          newParent: dto.parentConnectionId ?? null,
          newOlte: dto.olteId,
          newStatus: withPath.status,
        });
        await this.topology.recalcUsedPorts(tx, tenantId, [dto.olteId]);
        return withPath;
      });
      this.audit(tenantId, currentUser, created.id, 'CREATE', undefined, dto);
      return created;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Connection code already exists');
      }
      throw error;
    }
  }

  async findOne(tenantId: string, id: string): Promise<unknown> {
    const connection = await this.prisma.networkConnection.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        olte: { select: { id: true, code: true, name: true } },
        customer: CUSTOMER_SUMMARY_SELECT,
        parentConnection: {
          select: {
            id: true,
            connectionCode: true,
            nodeType: true,
            status: true,
            customer: CUSTOMER_SUMMARY_SELECT,
          },
        },
        childConnections: {
          where: { deletedAt: null },
          select: {
            id: true,
            connectionCode: true,
            nodeType: true,
            status: true,
            customer: CUSTOMER_SUMMARY_SELECT,
          },
        },
      },
    });
    if (!connection) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }
    const downstreamCount = await this.prisma.networkConnection.count({
      where: {
        tenantId,
        deletedAt: null,
        path: { startsWith: `${connection.path}.` },
      },
    });
    return { ...connection, downstreamCount };
  }

  async findAssigned(
    tenantId: string,
    userId: string,
    skip?: number,
    take?: number,
  ): Promise<unknown[]> {
    return this.prisma.networkConnection.findMany({
      where: { tenantId, deletedAt: null, assignedEmployeeId: userId },
      include: {
        olte: { select: { id: true, code: true, name: true } },
        customer: CUSTOMER_SUMMARY_SELECT,
      },
      orderBy: { updatedAt: 'desc' },
      skip: skip ?? 0,
      take: Math.min(take ?? 50, 200),
    });
  }

  async update(
    tenantId: string,
    id: string,
    currentUser: CurrentUserContext,
    dto: UpdateConnectionDto,
  ): Promise<unknown> {
    const existing = await this.topology.getNode(tenantId, id);
    const { installationDate, ...rest } = dto;
    const updated = await this.prisma.$transaction(async (tx) => {
      const connection = await tx.networkConnection.update({
        where: { id_tenantId: { id, tenantId } },
        data: {
          ...rest,
          installationDate: installationDate
            ? new Date(installationDate)
            : undefined,
          updatedBy: currentUser.userId,
        },
      });
      await this.writeHistory(tx, tenantId, currentUser.userId, {
        connectionId: id,
        action: 'UPDATED',
        previousStatus: existing.status,
        newStatus: connection.status,
        details: dto as unknown as Prisma.InputJsonValue,
      });
      return connection;
    });
    this.audit(tenantId, currentUser, id, 'UPDATE', existing, dto);
    return updated;
  }

  async move(
    tenantId: string,
    id: string,
    currentUser: CurrentUserContext,
    dto: MoveConnectionDto,
  ): Promise<unknown> {
    const node = await this.topology.getNode(tenantId, id);

    let newParent = null;
    let newOlteId: string;
    if (dto.newParentConnectionId) {
      newParent = await this.topology.getNode(
        tenantId,
        dto.newParentConnectionId,
      );
      this.topology.assertNotDescendant(node, newParent);
      newOlteId = newParent.olteId;
    } else {
      if (!dto.newOlteId) {
        throw new BadRequestException(
          'Either newParentConnectionId or newOlteId is required',
        );
      }
      const olte = await this.prisma.olte.findFirst({
        where: { id: dto.newOlteId, tenantId, deletedAt: null },
      });
      if (!olte) {
        throw new NotFoundException(`OLTE with ID ${dto.newOlteId} not found`);
      }
      newOlteId = dto.newOlteId;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.topology.reparentSubtree(
        tx,
        tenantId,
        node,
        newParent,
        newOlteId,
      );
      await this.writeHistory(tx, tenantId, currentUser.userId, {
        connectionId: id,
        action: 'MOVED',
        previousParent: node.parentConnectionId,
        newParent: newParent ? newParent.id : null,
        previousOlte: node.olteId,
        newOlte: newOlteId,
      });
      await this.topology.recalcUsedPorts(tx, tenantId, [
        node.olteId,
        newOlteId,
      ]);
    });
    this.audit(
      tenantId,
      currentUser,
      id,
      'MOVE',
      {
        parentConnectionId: node.parentConnectionId,
        olteId: node.olteId,
      },
      {
        parentConnectionId: newParent ? newParent.id : null,
        olteId: newOlteId,
      },
    );
    return this.findOne(tenantId, id);
  }

  /** Insert a JUNCTION under `id` and re-parent selected children onto it. */
  async split(
    tenantId: string,
    id: string,
    currentUser: CurrentUserContext,
    dto: SplitConnectionDto,
  ): Promise<unknown> {
    const node = await this.topology.getNode(tenantId, id);
    const children = await this.prisma.networkConnection.findMany({
      where: {
        tenantId,
        deletedAt: null,
        id: { in: dto.childConnectionIds },
        parentConnectionId: id,
      },
      select: { id: true },
    });
    if (children.length !== dto.childConnectionIds.length) {
      throw new BadRequestException(
        'All childConnectionIds must be direct children of the connection being split',
      );
    }

    try {
      const junctionId = await this.prisma.$transaction(async (tx) => {
        const junction = await tx.networkConnection.create({
          data: {
            tenantId,
            connectionCode: dto.junctionCode,
            olteId: node.olteId,
            parentConnectionId: id,
            nodeType: 'JUNCTION',
            status: 'ACTIVE',
            depth: node.depth + 1,
            path: 'pending',
            createdBy: currentUser.userId,
          },
        });
        const junctionNode = {
          id: junction.id,
          olteId: node.olteId,
          parentConnectionId: id,
          path: this.topology.buildPath(node, junction.id),
          depth: node.depth + 1,
          nodeType: 'JUNCTION',
          status: 'ACTIVE',
        };
        await tx.networkConnection.update({
          where: { id_tenantId: { id: junction.id, tenantId } },
          data: { path: junctionNode.path },
        });
        for (const childId of dto.childConnectionIds) {
          const child = await this.topology.getNodeTx(tx, tenantId, childId);
          await this.topology.reparentSubtree(
            tx,
            tenantId,
            child,
            junctionNode,
            node.olteId,
          );
        }
        await this.writeHistory(tx, tenantId, currentUser.userId, {
          connectionId: id,
          action: 'SPLIT',
          details: {
            junctionId: junction.id,
            movedChildren: dto.childConnectionIds,
          },
        });
        return junction.id;
      });
      this.audit(tenantId, currentUser, id, 'SPLIT', undefined, {
        junctionId,
        childConnectionIds: dto.childConnectionIds,
      });
      return this.findOne(tenantId, junctionId);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Junction code already exists');
      }
      throw error;
    }
  }

  /** Re-parent all children of `id` onto the target, then archive `id`. */
  async merge(
    tenantId: string,
    id: string,
    currentUser: CurrentUserContext,
    dto: MergeConnectionDto,
  ): Promise<unknown> {
    if (dto.targetConnectionId === id) {
      throw new BadRequestException('Cannot merge a connection into itself');
    }
    const source = await this.topology.getNode(tenantId, id);
    const target = await this.topology.getNode(
      tenantId,
      dto.targetConnectionId,
    );
    this.topology.assertNotDescendant(source, target);

    await this.prisma.$transaction(async (tx) => {
      const children = await tx.networkConnection.findMany({
        where: {
          tenantId,
          deletedAt: null,
          parentConnectionId: id,
        },
        select: { id: true },
      });
      for (const child of children) {
        const childNode = await this.topology.getNodeTx(tx, tenantId, child.id);
        await this.topology.reparentSubtree(
          tx,
          tenantId,
          childNode,
          target,
          target.olteId,
        );
      }
      await tx.networkConnection.update({
        where: { id_tenantId: { id, tenantId } },
        data: {
          status: 'DISCONNECTED',
          deletedAt: new Date(),
          updatedBy: currentUser.userId,
        },
      });
      await this.writeHistory(tx, tenantId, currentUser.userId, {
        connectionId: id,
        action: 'MERGED',
        newParent: target.id,
        previousOlte: source.olteId,
        newOlte: target.olteId,
        details: { mergedInto: target.id, movedChildren: children.length },
      });
      await this.topology.recalcUsedPorts(tx, tenantId, [
        source.olteId,
        target.olteId,
      ]);
    });
    this.audit(tenantId, currentUser, id, 'MERGE', undefined, {
      targetConnectionId: target.id,
    });
    return this.findOne(tenantId, target.id);
  }

  async disconnect(
    tenantId: string,
    id: string,
    currentUser: CurrentUserContext,
  ): Promise<unknown> {
    return this.setStatus(
      tenantId,
      id,
      currentUser,
      'DISCONNECTED',
      'DISCONNECTED',
    );
  }

  async reconnect(
    tenantId: string,
    id: string,
    currentUser: CurrentUserContext,
  ): Promise<unknown> {
    return this.setStatus(tenantId, id, currentUser, 'ACTIVE', 'RECONNECTED');
  }

  private async setStatus(
    tenantId: string,
    id: string,
    currentUser: CurrentUserContext,
    status: string,
    historyAction: string,
  ): Promise<unknown> {
    const node = await this.topology.getNode(tenantId, id);
    const impact = await this.topology.getImpact(tenantId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.networkConnection.update({
        where: { id_tenantId: { id, tenantId } },
        data: { status, updatedBy: currentUser.userId },
      });
      await this.writeHistory(tx, tenantId, currentUser.userId, {
        connectionId: id,
        action: historyAction,
        previousStatus: node.status,
        newStatus: status,
        details: { downstreamCustomerCount: impact.downstreamCustomerCount },
      });
      await this.topology.recalcUsedPorts(tx, tenantId, [node.olteId]);
    });
    this.audit(
      tenantId,
      currentUser,
      id,
      historyAction,
      { status: node.status },
      { status },
    );
    return { id, status, impact };
  }

  async getImpact(tenantId: string, id: string): Promise<ImpactResult> {
    return this.topology.getImpact(tenantId, id);
  }

  async getHistory(
    tenantId: string,
    id: string,
    skip?: number,
    take?: number,
  ): Promise<unknown[]> {
    await this.topology.getNodeIncludingArchived(tenantId, id);
    return this.prisma.connectionHistory.findMany({
      where: { tenantId, connectionId: id },
      orderBy: { performedAt: 'desc' },
      skip: skip ?? 0,
      take: Math.min(take ?? 50, 200),
    });
  }
}
