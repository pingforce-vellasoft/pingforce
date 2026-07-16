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

/** Every grantable data-scope level (DataScope.md §4). */
export const DATA_SCOPE_LEVELS = [
  'OWN',
  'CUSTOM',
  'TEAM',
  'DEPARTMENT',
  'BRANCH',
  'REGION',
  'BUSINESS_UNIT',
  'ALL',
] as const;

export type DataScopeLevel = (typeof DATA_SCOPE_LEVELS)[number];

/** Org-unit targets a CUSTOM override row may grant (DataScope.md §12). */
export const SCOPE_OVERRIDE_TYPES = [
  'EMPLOYEE',
  'TEAM',
  'DEPARTMENT',
  'BRANCH',
  'REGION',
  'BUSINESS_UNIT',
] as const;

export type ScopeOverrideType = (typeof SCOPE_OVERRIDE_TYPES)[number];

// When a role grants several actions, the broadest scope wins. CUSTOM has no
// natural rank (its breadth depends on the override rules), so it sits just
// above OWN — any hierarchical grant supersedes it.
const SCOPE_RANK: Record<DataScopeLevel, number> = {
  OWN: 1,
  CUSTOM: 2,
  TEAM: 3,
  DEPARTMENT: 4,
  BRANCH: 5,
  REGION: 6,
  BUSINESS_UNIT: 7,
  ALL: 8,
};

// TEAM walks the reporting hierarchy (direct + indirect reports —
// DataScope.md §8 "Reporting Hierarchy"). Depth cap keeps a corrupted
// (cyclic) hierarchy from looping; 10 levels covers any real org.
const TEAM_HIERARCHY_MAX_DEPTH = 10;

interface EmployeeRef {
  readonly id: string;
  readonly userId: string | null;
}

function isDataScopeLevel(value: string): value is DataScopeLevel {
  return (DATA_SCOPE_LEVELS as readonly string[]).includes(value);
}

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
   * Resolves the data scope granted for a module/action (DataScope.md §4).
   * SUPER_ADMIN → 'ALL'. No matching permission or an unknown stored level →
   * null (deny by default).
   */
  async getDataScope(
    userId: string,
    module: string,
    action: string,
  ): Promise<DataScopeLevel | null> {
    const { roleCode, grants } = await this.getUserGrants(userId);

    if (!roleCode) return null;
    if (roleCode === 'SUPER_ADMIN') return 'ALL';

    const match = grants.find(
      (g) => g.module === module && g.action === action,
    );

    if (!match || !isDataScopeLevel(match.dataScope)) return null;
    return match.dataScope;
  }

  /**
   * Builds a Prisma `where` fragment restricting employee-linked records to
   * the caller's data scope. Returns `null` when the caller has no visibility
   * (deny by default — DataScope.md §6). `module` is only consulted by the
   * CUSTOM level to pick the matching override rules.
   */
  async buildEmployeeScopeFilter(
    tenantId: string,
    userId: string,
    scope: DataScopeLevel | null,
    module: string | null = null,
  ): Promise<Record<string, unknown> | null> {
    if (scope === null) return null;
    const resolved = await this.resolveIdsForLevel(
      tenantId,
      userId,
      scope,
      module,
    );
    return this.employeeScopeWhere(resolved);
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
    // Scope resolution costs up to 2 extra queries per request (employee +
    // team/branch members) — cache the resolved id sets alongside the grants
    // with the same short TTL so role/team changes propagate within seconds.
    const cacheKey = `rbac_scope_${tenantId}_${userId}_${module}_${[...actions]
      .sort()
      .join('+')}`;
    const cached = await this.cacheManager.get<ResolvedDataScope>(cacheKey);
    if (cached) return cached;

    const resolved = await this.resolveScopeIdsUncached(
      tenantId,
      userId,
      module,
      actions,
    );
    await this.cacheManager.set(cacheKey, resolved, GRANTS_CACHE_TTL_MS);
    return resolved;
  }

  private async resolveScopeIdsUncached(
    tenantId: string,
    userId: string,
    module: string,
    actions: readonly string[],
  ): Promise<ResolvedDataScope> {
    let scope: DataScopeLevel | null = null;
    for (const action of actions) {
      const s = await this.getDataScope(userId, module, action);
      if (s && (scope === null || SCOPE_RANK[s] > SCOPE_RANK[scope])) {
        scope = s;
      }
    }
    if (scope === null) return { kind: 'NONE' };
    return this.resolveIdsForLevel(tenantId, userId, scope, module);
  }

  /** Turns one granted scope level into concrete id sets (DataScope.md §6). */
  private async resolveIdsForLevel(
    tenantId: string,
    userId: string,
    scope: DataScopeLevel,
    module: string | null,
  ): Promise<ResolvedDataScope> {
    if (scope === 'ALL') return { kind: 'ALL' };

    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, userId, deletedAt: null },
      select: {
        id: true,
        branchId: true,
        departmentId: true,
        regionId: true,
        businessUnitId: true,
      },
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

    if (scope === 'CUSTOM') {
      return this.resolveCustomScope(tenantId, userId, module, employee);
    }

    if (!employee) return { kind: 'NONE' };

    if (scope === 'TEAM') {
      const members = await this.walkReportingHierarchy(tenantId, [
        employee.id,
      ]);
      return this.toIdsScope(userId, [{ id: employee.id, userId }, ...members]);
    }

    // Org-unit scopes: the caller must belong to the unit, otherwise deny.
    const unitField = {
      DEPARTMENT: 'departmentId',
      BRANCH: 'branchId',
      REGION: 'regionId',
      BUSINESS_UNIT: 'businessUnitId',
    }[scope];
    const unitId = employee[unitField as keyof typeof employee] as
      | string
      | null;
    if (!unitId) return { kind: 'NONE' };

    const members: EmployeeRef[] = await this.prisma.employee.findMany({
      where: { tenantId, [unitField]: unitId, deletedAt: null },
      select: { id: true, userId: true },
    });
    return this.toIdsScope(userId, [{ id: employee.id, userId }, ...members]);
  }

  /**
   * CUSTOM scope (DataScope.md §4/§12): the caller sees their own records
   * plus everything granted by their active user_scope_overrides rows for
   * this module (rows with a NULL module apply everywhere).
   */
  private async resolveCustomScope(
    tenantId: string,
    userId: string,
    module: string | null,
    employee: { id: string } | null,
  ): Promise<ResolvedDataScope> {
    const now = new Date();
    const overrides = await this.prisma.userScopeOverride.findMany({
      where: {
        tenantId,
        userId,
        deletedAt: null,
        OR: [{ module: null }, ...(module ? [{ module }] : [])],
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
      select: { scopeType: true, targetId: true },
    });

    const targetsByType = new Map<string, string[]>();
    for (const o of overrides) {
      const list = targetsByType.get(o.scopeType) ?? [];
      list.push(o.targetId);
      targetsByType.set(o.scopeType, list);
    }

    const members: EmployeeRef[] = employee
      ? [{ id: employee.id, userId }]
      : [];

    const employeeTargets = targetsByType.get('EMPLOYEE');
    if (employeeTargets?.length) {
      members.push(
        ...(await this.prisma.employee.findMany({
          where: { tenantId, id: { in: employeeTargets }, deletedAt: null },
          select: { id: true, userId: true },
        })),
      );
    }

    // TEAM targets grant the target manager plus their whole reporting subtree
    const teamTargets = targetsByType.get('TEAM');
    if (teamTargets?.length) {
      members.push(
        ...(await this.prisma.employee.findMany({
          where: { tenantId, id: { in: teamTargets }, deletedAt: null },
          select: { id: true, userId: true },
        })),
        ...(await this.walkReportingHierarchy(tenantId, teamTargets)),
      );
    }

    const unitFields: readonly (readonly [ScopeOverrideType, string])[] = [
      ['DEPARTMENT', 'departmentId'],
      ['BRANCH', 'branchId'],
      ['REGION', 'regionId'],
      ['BUSINESS_UNIT', 'businessUnitId'],
    ];
    for (const [type, field] of unitFields) {
      const targets = targetsByType.get(type);
      if (targets?.length) {
        members.push(
          ...(await this.prisma.employee.findMany({
            where: { tenantId, [field]: { in: targets }, deletedAt: null },
            select: { id: true, userId: true },
          })),
        );
      }
    }

    return this.toIdsScope(userId, members);
  }

  /**
   * Collects direct AND indirect reports of the given root employees via a
   * breadth-first walk over reportingManagerId (DataScope.md §8). Cycle-safe;
   * bounded by TEAM_HIERARCHY_MAX_DEPTH levels.
   */
  private async walkReportingHierarchy(
    tenantId: string,
    rootEmployeeIds: readonly string[],
  ): Promise<EmployeeRef[]> {
    const seen = new Set<string>(rootEmployeeIds);
    let frontier = [...rootEmployeeIds];
    const members: EmployeeRef[] = [];

    for (
      let depth = 0;
      depth < TEAM_HIERARCHY_MAX_DEPTH && frontier.length > 0;
      depth++
    ) {
      const rows: EmployeeRef[] = await this.prisma.employee.findMany({
        where: {
          tenantId,
          reportingManagerId: { in: frontier },
          deletedAt: null,
        },
        select: { id: true, userId: true },
      });
      frontier = [];
      for (const row of rows) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          members.push(row);
          frontier.push(row.id);
        }
      }
    }
    return members;
  }

  private toIdsScope(
    callerUserId: string,
    members: readonly EmployeeRef[],
  ): ResolvedDataScope {
    const employeeIds = new Set<string>();
    const userIds = new Set<string>([callerUserId]);
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
    dataScopes?: Record<string, DataScopeLevel>,
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
                dataScope: dataScopes?.[permissionId] ?? 'OWN',
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

  // ---------------------------------------------------------------------------
  // CUSTOM scope overrides (DataScope.md §12 — user_scope_overrides)
  // Changes propagate within GRANTS_CACHE_TTL_MS via the resolved-scope cache.
  // ---------------------------------------------------------------------------

  async listScopeOverrides(tenantId: string, userId?: string) {
    return this.prisma.userScopeOverride.findMany({
      where: { tenantId, deletedAt: null, ...(userId && { userId }) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createScopeOverride(
    tenantId: string,
    actorUserId: string,
    data: {
      userId: string;
      module?: string;
      scopeType: ScopeOverrideType;
      targetId: string;
      validFrom?: Date;
      validUntil?: Date;
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: data.userId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found in this tenant');
    }

    return this.prisma.userScopeOverride.create({
      data: {
        tenantId,
        userId: data.userId,
        module: data.module ?? null,
        scopeType: data.scopeType,
        targetId: data.targetId,
        validFrom: data.validFrom ?? null,
        validUntil: data.validUntil ?? null,
        createdBy: actorUserId,
      },
    });
  }

  async deleteScopeOverride(
    tenantId: string,
    actorUserId: string,
    overrideId: string,
  ) {
    const override = await this.prisma.userScopeOverride.findFirst({
      where: { id: overrideId, tenantId, deletedAt: null },
    });
    if (!override) {
      throw new NotFoundException('Scope override not found');
    }
    return this.prisma.userScopeOverride.update({
      where: { id: overrideId },
      data: { deletedAt: new Date(), updatedBy: actorUserId },
    });
  }
}
