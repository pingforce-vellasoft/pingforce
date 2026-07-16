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

/**
 * Data scope resolved to concrete record-id sets (DataScope.md §6-§7).
 *
 * - ALL:  no additional filtering (tenant admins / super admin)
 * - NONE: deny — caller has no visibility, return empty results
 * - IDS:  restrict to these employee ids (employee-linked records) and/or
 *         user ids (owner/assignee/creator-linked records)
 */
export type ResolvedDataScope =
  | { readonly kind: 'ALL' }
  | { readonly kind: 'NONE' }
  | {
      readonly kind: 'IDS';
      readonly employeeIds: readonly string[];
      readonly userIds: readonly string[];
    };

const SCOPE_RANK = { OWN: 1, TEAM: 2, BRANCH: 3, ALL: 4 } as const;

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

  /**
   * Resolves the caller's effective data scope for a module into concrete
   * id sets usable as query filters (DataScope.md §6-§7, §13). When several
   * actions are passed (e.g. READ + READ_OWN) the broadest granted scope
   * wins. Default outcome: NONE (deny).
   */
  async resolveScopeIds(
    tenantId: string,
    userId: string,
    module: string,
    actions: readonly string[],
  ): Promise<ResolvedDataScope> {
    let scope: 'OWN' | 'TEAM' | 'BRANCH' | 'ALL' | null = null;
    for (const action of actions) {
      const s = await this.getDataScope(userId, module, action);
      if (s && (scope === null || SCOPE_RANK[s] > SCOPE_RANK[scope])) {
        scope = s;
      }
    }
    if (scope === null) return { kind: 'NONE' };
    if (scope === 'ALL') return { kind: 'ALL' };

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: { id: true, branchId: true },
    });

    if (scope === 'OWN') {
      // A user without an employee record still owns user-linked records
      // (created faults/leads), so OWN keeps the caller's userId visible.
      return {
        kind: 'IDS',
        employeeIds: employee ? [employee.id] : [],
        userIds: [userId],
      };
    }

    if (!employee) return { kind: 'NONE' };
    if (scope === 'BRANCH' && !employee.branchId) return { kind: 'NONE' };

    const members = await this.prisma.employee.findMany({
      where:
        scope === 'TEAM'
          ? { tenantId, reportingManagerId: employee.id, deletedAt: null }
          : { tenantId, branchId: employee.branchId, deletedAt: null },
      select: { id: true, userId: true },
    });

    const employeeIds = new Set<string>([employee.id]);
    const userIds = new Set<string>([userId]);
    for (const m of members) {
      employeeIds.add(m.id);
      if (m.userId) userIds.add(m.userId);
    }
    return {
      kind: 'IDS',
      employeeIds: [...employeeIds],
      userIds: [...userIds],
    };
  }

  /**
   * Prisma `where` fragment for records linked to an employee id column.
   * Returns null when the caller has no visibility (deny).
   */
  employeeScopeWhere(
    scope: ResolvedDataScope,
    field = 'employeeId',
  ): Record<string, unknown> | null {
    if (scope.kind === 'NONE') return null;
    if (scope.kind === 'ALL') return {};
    return { [field]: { in: [...scope.employeeIds] } };
  }

  /**
   * Prisma `where` fragment for records linked to user id columns
   * (owner/assignee/creator). Returns null when the caller has no visibility.
   */
  userScopeWhere(
    scope: ResolvedDataScope,
    fields: readonly string[],
  ): Record<string, unknown> | null {
    if (scope.kind === 'NONE') return null;
    if (scope.kind === 'ALL') return {};
    return {
      OR: fields.map((f) => ({ [f]: { in: [...scope.userIds] } })),
    };
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
