import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IPrismaService, CurrentUserContext } from '@pingforce-monorepo/shared';
import { AuditService } from '../../audit/audit.service';
import { CreateOlteDto } from './dto/create-olte.dto';
import { UpdateOlteDto } from './dto/update-olte.dto';

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

@Injectable()
export class OlteService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    currentUser: CurrentUserContext,
    dto: CreateOlteDto,
  ): Promise<unknown> {
    try {
      const olte = await this.prisma.olte.create({
        data: { ...dto, tenantId, createdBy: currentUser.userId },
      });
      void this.auditService.log({
        tenantId,
        actorId: currentUser.userId,
        module: 'NETWORK',
        entityName: 'Olte',
        entityId: olte.id,
        action: 'CREATE',
        newValue: dto,
      });
      return olte;
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('OLTE code already exists');
      }
      throw error;
    }
  }

  async findAll(
    tenantId: string,
    skip?: number,
    take?: number,
    status?: string,
  ): Promise<unknown[]> {
    return this.prisma.olte.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: { code: 'asc' },
      skip: skip ?? 0,
      take: Math.min(take ?? DEFAULT_TAKE, MAX_TAKE),
    });
  }

  async findOne(tenantId: string, id: string): Promise<unknown> {
    const olte = await this.prisma.olte.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!olte) {
      throw new NotFoundException(`OLTE with ID ${id} not found`);
    }
    const [totalConnections, activeConnections] = await Promise.all([
      this.prisma.networkConnection.count({
        where: { tenantId, olteId: id, deletedAt: null },
      }),
      this.prisma.networkConnection.count({
        where: { tenantId, olteId: id, deletedAt: null, status: 'ACTIVE' },
      }),
    ]);
    return {
      ...olte,
      totalConnections,
      activeConnections,
      availablePorts: Math.max(olte.totalPorts - olte.usedPorts, 0),
    };
  }

  async update(
    tenantId: string,
    id: string,
    currentUser: CurrentUserContext,
    dto: UpdateOlteDto,
  ): Promise<unknown> {
    const existing = await this.prisma.olte.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`OLTE with ID ${id} not found`);
    }
    const olte = await this.prisma.olte.update({
      where: { id_tenantId: { id, tenantId } },
      data: { ...dto, updatedBy: currentUser.userId },
    });
    void this.auditService.log({
      tenantId,
      actorId: currentUser.userId,
      module: 'NETWORK',
      entityName: 'Olte',
      entityId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: dto,
    });
    return olte;
  }

  /** Soft archive. Blocked while the OLTE still carries live connections. */
  async archive(
    tenantId: string,
    id: string,
    currentUser: CurrentUserContext,
  ): Promise<unknown> {
    const existing = await this.prisma.olte.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`OLTE with ID ${id} not found`);
    }
    const liveConnections = await this.prisma.networkConnection.count({
      where: {
        tenantId,
        olteId: id,
        deletedAt: null,
        status: { not: 'DISCONNECTED' },
      },
    });
    if (liveConnections > 0) {
      throw new BadRequestException(
        `Cannot archive OLTE: ${liveConnections} live connection(s) attached. Move or disconnect them first.`,
      );
    }
    const olte = await this.prisma.olte.update({
      where: { id_tenantId: { id, tenantId } },
      data: {
        status: 'ARCHIVED',
        deletedAt: new Date(),
        updatedBy: currentUser.userId,
      },
    });
    void this.auditService.log({
      tenantId,
      actorId: currentUser.userId,
      module: 'NETWORK',
      entityName: 'Olte',
      entityId: id,
      action: 'ARCHIVE',
      oldValue: { status: existing.status },
      newValue: { status: 'ARCHIVED' },
    });
    return olte;
  }
}
