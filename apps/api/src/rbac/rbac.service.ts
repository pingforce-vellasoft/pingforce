import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { IPrismaService } from '@pingforce-monorepo/shared';

interface CachedGrant {
  readonly module: string;
  readonly action: string;
  readonly dataScope: string;
}

interface CachedUserGrants {
  readonly roleCode: string | null;
  readonly grants: CachedGrant[];
}

// Short TTL: permission changes propagate within seconds while the guard
// stops hitting the database on every request.
const GRANTS_CACHE_TTL_MS = 30_000;

@Injectable()
export class RbacService {
  constructor(
    @Inject('IPrismaService') private prisma: IPrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async getUserGrants(userId: string): Promise<CachedUserGrants> {
    const cacheKey = `rbac_grants_${userId}`;
    const cached = await this.cacheManager.get<CachedUserGrants>(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const result: CachedUserGrants = {
      roleCode: user?.role?.code ?? null,
      grants:
        user?.role?.permissions.map((rp) => ({
          module: rp.permission.module,
          action: rp.permission.action,
          dataScope: rp.dataScope,
        })) ?? [],
    };

    await this.cacheManager.set(cacheKey, result, GRANTS_CACHE_TTL_MS);
    return result;
  }

  async hasPermission(
    userId: string,
    module: string,
    action: string,
  ): Promise<boolean> {
    const { roleCode, grants } = await this.getUserGrants(userId);

    if (!roleCode) {
      return false; // No role assigned
    }

    // Bypass permission check for SUPER_ADMIN
    if (roleCode === 'SUPER_ADMIN') {
      return true;
    }

    return grants.some((g) => g.module === module && g.action === action);
  }

  /**
   * Resolves the data scope granted for a module/action (DataScope.md).
   * SUPER_ADMIN → 'ALL'. No matching permission → null (deny).
   */
  async getDataScope(
    userId: string,
    module: string,
    action: string,
  ): Promise<'OWN' | 'TEAM' | 'BRANCH' | 'ALL' | null> {
    const { roleCode, grants } = await this.getUserGrants(userId);

    if (!roleCode) return null;
    if (roleCode === 'SUPER_ADMIN') return 'ALL';

    const match = grants.find(
      (g) => g.module === module && g.action === action,
    );

    return (match?.dataScope as 'OWN' | 'TEAM' | 'BRANCH' | 'ALL') ?? null;
  }

  /**
   * Builds a Prisma `where` fragment restricting employee-linked records to
   * the caller's data scope. Returns `null` when the caller has no visibility
   * (deny by default — DataScope.md §6).
   */
  async buildEmployeeScopeFilter(
    tenantId: string,
    userId: string,
    scope: 'OWN' | 'TEAM' | 'BRANCH' | 'ALL' | null,
  ): Promise<Record<string, unknown> | null> {
    if (scope === null) return null;
    if (scope === 'ALL') return {};

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true, branchId: true },
    });
    if (!employee) return null;

    switch (scope) {
      case 'OWN':
        return { employeeId: employee.id };
      case 'TEAM':
        return { employee: { reportingManagerId: employee.id } };
      case 'BRANCH':
        return employee.branchId
          ? { employee: { branchId: employee.branchId } }
          : null;
      default:
        return null;
    }
  }

  async findAllRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async createRole(
    tenantId: string,
    data: {
      name: string;
      code: string;
      description?: string;
      permissionIds?: string[];
    },
  ) {
    return this.prisma.role.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        description: data.description,
        permissions:
          data.permissionIds && data.permissionIds.length > 0
            ? {
                create: data.permissionIds.map((permId) => ({
                  permissionId: permId,
                  dataScope: 'OWN',
                })),
              }
            : undefined,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async updateRole(
    tenantId: string,
    roleId: string,
    data: { name: string; description?: string },
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found in this tenant');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Cannot edit system roles');
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  async findAllPermissions(tenantId?: string) {
    if (tenantId && tenantId !== 'SYSTEM') {
      // Tenant users may see every module except platform-level ones
      const platformModules = ['TENANTS', 'BILLING', 'SETTINGS'];
      return this.prisma.permission.findMany({
        where: { module: { notIn: platformModules } },
      });
    }
    return this.prisma.permission.findMany();
  }

  async updateRolePermissions(
    tenantId: string,
    roleId: string,
    permissionIds: string[],
  ) {
    // First, verify the role belongs to the tenant
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found in this tenant');
    }

    // Replace the grant set atomically — a crash between delete and insert
    // must never leave the role with no permissions (PRISMA_GUIDELINES.md §10)
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      ...(permissionIds && permissionIds.length > 0
        ? [
            this.prisma.rolePermission.createMany({
              data: permissionIds.map((permissionId) => ({
                roleId,
                permissionId,
                dataScope: 'OWN', // Default scope
              })),
            }),
          ]
        : []),
    ]);

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async deleteRole(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found in this tenant');
    }

    if (role.isSystem) {
      throw new ForbiddenException('Cannot delete system roles');
    }

    if (role._count.users > 0) {
      throw new ConflictException(
        'Cannot delete a role that is assigned to users. Reassign users first.',
      );
    }

    // RolePermission records might have a foreign key constraint or we just delete them explicitly
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    return this.prisma.role.delete({
      where: { id: roleId },
    });
  }
}
