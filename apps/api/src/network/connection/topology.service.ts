import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import { Prisma } from '@prisma/client';

export interface TopologyNode {
  readonly id: string;
  readonly olteId: string;
  readonly parentConnectionId: string | null;
  readonly path: string;
  readonly depth: number;
  readonly nodeType: string;
  readonly status: string;
}

export interface ImpactResult {
  readonly connectionId: string;
  readonly downstreamCount: number;
  readonly downstreamCustomerCount: number;
  readonly downstream: {
    id: string;
    connectionCode: string;
    customerId: string | null;
    status: string;
  }[];
}

type Tx = Prisma.TransactionClient;

/**
 * Tree math for the connection topology (3.7_ConnectionMap §5.3).
 *
 * Topology is an adjacency list (parentConnectionId) plus a materialized
 * `path` of connection ids ("root.child....id") so subtree reads are a
 * single indexed prefix scan. Every mutation that changes a parent link
 * rebuilds path/depth for the affected subtree inside the caller's
 * transaction — the two representations are never allowed to drift.
 */
@Injectable()
export class TopologyService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
  ) {}

  buildPath(parent: Pick<TopologyNode, 'path'> | null, id: string): string {
    return parent ? `${parent.path}.${id}` : id;
  }

  /** Cycle guard: a node may never be moved under its own descendant. */
  assertNotDescendant(node: TopologyNode, candidateParent: TopologyNode): void {
    if (
      candidateParent.id === node.id ||
      candidateParent.path === node.path ||
      candidateParent.path.startsWith(`${node.path}.`)
    ) {
      throw new BadRequestException(
        'Invalid move: target parent is the connection itself or one of its descendants',
      );
    }
  }

  async getNode(tenantId: string, id: string): Promise<TopologyNode> {
    return this.getNodeTx(this.prisma, tenantId, id);
  }

  /** Same as getNode but reads through a transaction client, so callers
   *  inside a $transaction observe their own uncommitted topology writes. */
  async getNodeTx(
    db: Tx | IPrismaService,
    tenantId: string,
    id: string,
  ): Promise<TopologyNode> {
    const node = await db.networkConnection.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        olteId: true,
        parentConnectionId: true,
        path: true,
        depth: true,
        nodeType: true,
        status: true,
      },
    });
    if (!node) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }
    return node;
  }

  /** History stays readable after archive — lookup without the soft-delete filter. */
  async getNodeIncludingArchived(
    tenantId: string,
    id: string,
  ): Promise<{ id: string }> {
    const node = await this.prisma.networkConnection.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!node) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }
    return node;
  }

  /**
   * Re-parents a subtree: updates the root's parent link, then rewrites
   * path/depth (and olteId when moving across OLTEs) for the whole subtree
   * with a single indexed UPDATE. Must run inside a transaction.
   */
  async reparentSubtree(
    tx: Tx,
    tenantId: string,
    node: TopologyNode,
    newParent: TopologyNode | null,
    newOlteId: string,
  ): Promise<void> {
    const oldPrefix = node.path;
    const newPath = this.buildPath(newParent, node.id);
    const newDepth = newParent ? newParent.depth + 1 : 0;
    const depthDelta = newDepth - node.depth;

    await tx.networkConnection.update({
      where: { id_tenantId: { id: node.id, tenantId } },
      data: {
        parentConnectionId: newParent ? newParent.id : null,
        olteId: newOlteId,
        path: newPath,
        depth: newDepth,
      },
    });

    // Rewrite descendants in one statement. Parameterized — no interpolation.
    await tx.$executeRaw`
      UPDATE "network_connections"
      SET "path" = ${newPath} || substring("path" from ${oldPrefix.length + 1}),
          "depth" = "depth" + ${depthDelta},
          "olteId" = ${newOlteId}
      WHERE "tenantId" = ${tenantId}
        AND "path" LIKE ${`${oldPrefix}.%`}
    `;
  }

  /** Downstream impact: everything below the node (excluding the node). */
  async getImpact(tenantId: string, id: string): Promise<ImpactResult> {
    const node = await this.getNode(tenantId, id);

    const downstream = await this.prisma.networkConnection.findMany({
      where: {
        tenantId,
        deletedAt: null,
        path: { startsWith: `${node.path}.` },
      },
      select: {
        id: true,
        connectionCode: true,
        customerId: true,
        status: true,
      },
      orderBy: { depth: 'asc' },
    });

    return {
      connectionId: id,
      downstreamCount: downstream.length,
      downstreamCustomerCount: downstream.filter((d) => d.customerId !== null)
        .length,
      downstream,
    };
  }

  /** Root-level connection count per OLTE — drives Olte.usedPorts. */
  async recalcUsedPorts(
    tx: Tx,
    tenantId: string,
    olteIds: readonly string[],
  ): Promise<void> {
    const unique = [...new Set(olteIds)];
    for (const olteId of unique) {
      const used = await tx.networkConnection.count({
        where: {
          tenantId,
          olteId,
          parentConnectionId: null,
          deletedAt: null,
          status: { not: 'DISCONNECTED' },
        },
      });
      await tx.olte.update({
        where: { id_tenantId: { id: olteId, tenantId } },
        data: { usedPorts: used },
      });
    }
  }
}
