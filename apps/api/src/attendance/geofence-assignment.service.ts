import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExtendedPrismaClient } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { GeofenceCacheService } from './geofence-cache.service';
import {
  AssignEmployeesDto,
  AssignableEmployeesQueryDto,
  UnassignEmployeesDto,
  UpdateGeofencePolicyDto,
} from './dto/geofence-assignment.dto';

interface Actor {
  readonly userId: string;
  readonly tenantId: string;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/**
 * Employee ↔ geofence assignment.
 *
 * Attendance geofencing used to be tenant-wide: any employee could punch at
 * any active geofence of their tenant. This service scopes it — an employee
 * punches only at the sites they are assigned to, and an employee assigned to
 * nothing cannot punch at all (the punch path returns GEOFENCE-001 telling
 * them to contact their admin).
 *
 * How many geofences one employee may hold is the tenant's decision, stored on
 * AttendancePolicy.allowMultipleGeofencesPerEmployee. With it off (the
 * default) assigning an already-assigned employee is a 409 that names the
 * geofence they are on, unless the admin passes `reassign` to move them.
 */
@Injectable()
export class GeofenceAssignmentService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: ExtendedPrismaClient,
    private readonly auditService: AuditService,
    private readonly geofenceCache: GeofenceCacheService,
  ) {}

  /**
   * Resolves the geofence within the caller's tenant. Every public method
   * routes through this so a geofence id belonging to another tenant is a 404
   * rather than a cross-tenant read.
   */
  private async requireGeofence(tenantId: string, geofenceId: string) {
    const geofence = await this.prisma.geofence.findFirst({
      where: { id: geofenceId, tenantId, deletedAt: null, active: true },
      select: { id: true, name: true, tenantId: true },
    });
    if (!geofence) {
      throw new NotFoundException('Geofence not found');
    }
    return geofence;
  }

  /** The tenant's multi-geofence setting; false when no policy row exists. */
  async allowsMultiple(tenantId: string): Promise<boolean> {
    const policy = await this.prisma.attendancePolicy.findFirst({
      where: { tenantId, deletedAt: null },
      select: { allowMultipleGeofencesPerEmployee: true },
    });
    return policy?.allowMultipleGeofencesPerEmployee ?? false;
  }

  async updatePolicy(actor: Actor, dto: UpdateGeofencePolicyDto) {
    const existing = await this.prisma.attendancePolicy.findFirst({
      where: { tenantId: actor.tenantId, deletedAt: null },
      select: { id: true, allowMultipleGeofencesPerEmployee: true },
    });

    // Turning multi-assignment OFF does not retroactively strip the extra
    // assignments employees already hold — that would silently lock people out
    // of sites mid-shift. The flag governs what may be newly assigned; the
    // count of employees already over the limit is surfaced so the admin can
    // clean up deliberately.
    const policy = existing
      ? await this.prisma.attendancePolicy.update({
          where: { id: existing.id },
          data: {
            allowMultipleGeofencesPerEmployee:
              dto.allowMultipleGeofencesPerEmployee,
            updatedBy: actor.userId,
          },
        })
      : await this.prisma.attendancePolicy.create({
          data: {
            tenantId: actor.tenantId,
            allowMultipleGeofencesPerEmployee:
              dto.allowMultipleGeofencesPerEmployee,
            createdBy: actor.userId,
          },
        });

    let employeesOverLimit = 0;
    if (!dto.allowMultipleGeofencesPerEmployee) {
      const grouped = await this.prisma.employeeGeofence.groupBy({
        by: ['employeeId'],
        where: { tenantId: actor.tenantId, deletedAt: null },
        _count: { _all: true },
      });
      employeesOverLimit = grouped.filter((g) => g._count._all > 1).length;
    }

    void this.auditService.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'ATTENDANCE',
      entityName: 'attendance_policy',
      entityId: policy.id,
      action: 'UPDATE_GEOFENCE_ASSIGNMENT_POLICY',
      oldValue: {
        allowMultipleGeofencesPerEmployee:
          existing?.allowMultipleGeofencesPerEmployee ?? false,
      },
      newValue: {
        allowMultipleGeofencesPerEmployee:
          dto.allowMultipleGeofencesPerEmployee,
      },
    });

    return {
      allowMultipleGeofencesPerEmployee:
        policy.allowMultipleGeofencesPerEmployee,
      employeesOverLimit,
    };
  }

  /** Employees currently assigned to one geofence. */
  async listAssigned(actor: Actor, geofenceId: string) {
    const geofence = await this.requireGeofence(actor.tenantId, geofenceId);

    const rows = await this.prisma.employeeGeofence.findMany({
      where: {
        tenantId: actor.tenantId,
        geofenceId: geofence.id,
        deletedAt: null,
        // An employee soft-deleted after being assigned must not linger on the
        // roster. The assignment row survives for audit; the listing hides it.
        employee: { deletedAt: null },
      },
      select: {
        id: true,
        assignedAt: true,
        assignedBy: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            displayName: true,
            employmentStatus: true,
            photograph: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return {
      geofence: { id: geofence.id, name: geofence.name },
      total: rows.length,
      employees: rows.map((r) => ({
        assignmentId: r.id,
        assignedAt: r.assignedAt,
        // Null assignedBy marks a row created by the backfill migration rather
        // than by an admin — worth showing rather than hiding during an audit.
        assignedBy: r.assignedBy,
        ...r.employee,
      })),
    };
  }

  /**
   * Candidates for the picker. Employees already on this geofence are always
   * excluded. When the tenant allows only one geofence per employee, those
   * assigned elsewhere are excluded too under the default ASSIGNABLE scope,
   * and returned with `currentGeofence` populated under ALL so the admin can
   * choose to reassign.
   */
  async listAssignable(
    actor: Actor,
    geofenceId: string,
    query: AssignableEmployeesQueryDto,
  ) {
    await this.requireGeofence(actor.tenantId, geofenceId);
    const allowMultiple = await this.allowsMultiple(actor.tenantId);
    const scope = query.scope ?? 'ASSIGNABLE';

    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE),
    );

    const search = query.search?.trim();
    const searchFilter = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { displayName: { contains: search, mode: 'insensitive' as const } },
            {
              employeeCode: { contains: search, mode: 'insensitive' as const },
            },
          ],
        }
      : {};

    // Excluded unconditionally: already on this geofence. Excluded also when
    // single-geofence mode is on and the caller asked for assignable only:
    // anyone holding any other live assignment.
    const excludeClause =
      !allowMultiple && scope === 'ASSIGNABLE'
        ? { geofenceAssignments: { none: { deletedAt: null } } }
        : {
            geofenceAssignments: {
              none: { deletedAt: null, geofenceId },
            },
          };

    const where = {
      tenantId: actor.tenantId,
      deletedAt: null,
      employmentStatus: 'ACTIVE',
      ...searchFilter,
      ...excludeClause,
    };

    const [total, employees, tenantEmployeeCount] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          displayName: true,
          photograph: true,
          geofenceAssignments: {
            where: { deletedAt: null },
            select: {
              geofenceId: true,
              geofence: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      // Drives the "no employees yet — create some first" empty state, which
      // must be told apart from "employees exist but none match this filter".
      this.prisma.employee.count({
        where: {
          tenantId: actor.tenantId,
          deletedAt: null,
          employmentStatus: 'ACTIVE',
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      allowMultipleGeofencesPerEmployee: allowMultiple,
      /** Zero means the tenant has no employees at all, not merely no matches. */
      tenantHasEmployees: tenantEmployeeCount > 0,
      employees: employees.map((e) => {
        const other = e.geofenceAssignments.filter(
          (a) => a.geofenceId !== geofenceId,
        );
        return {
          id: e.id,
          employeeCode: e.employeeCode,
          firstName: e.firstName,
          lastName: e.lastName,
          displayName: e.displayName,
          photograph: e.photograph,
          currentGeofences: other.map((a) => a.geofence),
          // In single-geofence mode this employee can only be added by moving
          // them, so the UI can warn before submitting with `reassign`.
          requiresReassign: !allowMultiple && other.length > 0,
        };
      }),
    };
  }

  /**
   * Assigns employees to a geofence.
   *
   * Idempotent: ids already assigned here are reported as `skipped`, not
   * rejected. Everything runs in one transaction so a conflict partway through
   * a batch leaves no half-applied assignment.
   */
  async assign(actor: Actor, geofenceId: string, dto: AssignEmployeesDto) {
    const geofence = await this.requireGeofence(actor.tenantId, geofenceId);
    const allowMultiple = await this.allowsMultiple(actor.tenantId);

    // Tenant-scoped lookup: ids that belong to another tenant, are
    // soft-deleted, or are inactive simply do not come back, and the count
    // mismatch below turns that into a 400 instead of a silent partial assign.
    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: dto.employeeIds },
        tenantId: actor.tenantId,
        deletedAt: null,
        employmentStatus: 'ACTIVE',
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (employees.length !== dto.employeeIds.length) {
      const found = new Set(employees.map((e) => e.id));
      const missing = dto.employeeIds.filter((id) => !found.has(id));
      throw new BadRequestException({
        errorCode: 'GEOFENCE-002',
        message:
          'Some employees could not be assigned because they do not exist, are inactive, or belong to another tenant.',
        employeeIds: missing,
      });
    }

    const existing = await this.prisma.employeeGeofence.findMany({
      where: {
        tenantId: actor.tenantId,
        employeeId: { in: dto.employeeIds },
        deletedAt: null,
      },
      select: {
        id: true,
        employeeId: true,
        geofenceId: true,
        geofence: { select: { id: true, name: true } },
      },
    });

    const alreadyHere = existing.filter((e) => e.geofenceId === geofence.id);
    const elsewhere = existing.filter((e) => e.geofenceId !== geofence.id);

    // Single-geofence tenant: moving someone is allowed but must be explicit,
    // so an admin never silently strips an assignment they could not see.
    if (!allowMultiple && elsewhere.length > 0 && !dto.reassign) {
      const nameById = new Map(
        employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`.trim()]),
      );
      throw new ConflictException({
        errorCode: 'GEOFENCE-003',
        message:
          'These employees are already assigned to another geofence. This tenant allows one geofence per employee — resubmit with reassign to move them, or enable multiple geofences per employee.',
        conflicts: elsewhere.map((e) => ({
          employeeId: e.employeeId,
          employeeName: nameById.get(e.employeeId) ?? null,
          currentGeofenceId: e.geofence.id,
          currentGeofenceName: e.geofence.name,
        })),
      });
    }

    const skipped = alreadyHere.map((a) => a.employeeId);
    const toAssign = dto.employeeIds.filter((id) => !skipped.includes(id));
    // Only released when explicitly reassigning under single-geofence rules;
    // a multi-geofence tenant keeps every existing assignment.
    const toRelease =
      !allowMultiple && dto.reassign
        ? elsewhere.filter((e) => toAssign.includes(e.employeeId))
        : [];

    await this.prisma.$transaction(async (tx) => {
      if (toRelease.length > 0) {
        await tx.employeeGeofence.updateMany({
          where: {
            id: { in: toRelease.map((r) => r.id) },
            tenantId: actor.tenantId,
          },
          data: { deletedAt: new Date() },
        });
      }

      for (const employeeId of toAssign) {
        // Upsert on the unique pair revives a previously unassigned row rather
        // than inserting a duplicate, which is what keeps the unique index
        // valid across repeated assign/unassign cycles.
        await tx.employeeGeofence.upsert({
          where: {
            employeeId_geofenceId: { employeeId, geofenceId: geofence.id },
          },
          create: {
            tenantId: actor.tenantId,
            employeeId,
            geofenceId: geofence.id,
            assignedBy: actor.userId,
          },
          update: {
            deletedAt: null,
            assignedAt: new Date(),
            assignedBy: actor.userId,
          },
        });
      }
    });

    // Punch decisions are cached per employee — every touched employee must be
    // dropped or a freshly assigned worker keeps failing until the TTL lapses.
    const touched = new Set<string>([
      ...toAssign,
      ...toRelease.map((r) => r.employeeId),
    ]);
    await this.geofenceCache.invalidateEmployees(actor.tenantId, [...touched]);

    void this.auditService.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'ATTENDANCE',
      entityName: 'employee_geofence',
      entityId: geofence.id,
      action: 'ASSIGN_EMPLOYEES',
      newValue: {
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        assigned: toAssign,
        skipped,
        released: toRelease.map((r) => ({
          employeeId: r.employeeId,
          fromGeofenceId: r.geofenceId,
        })),
      },
    });

    return {
      geofenceId: geofence.id,
      assigned: toAssign.length,
      skipped: skipped.length,
      reassigned: toRelease.length,
    };
  }

  /**
   * Removes employees from a geofence. Soft delete — the row stays for audit.
   *
   * `leftWithoutGeofence` counts employees who now hold no assignment at all
   * and therefore cannot punch anywhere; the UI warns on a non-zero value.
   */
  async unassign(actor: Actor, geofenceId: string, dto: UnassignEmployeesDto) {
    const geofence = await this.requireGeofence(actor.tenantId, geofenceId);

    const rows = await this.prisma.employeeGeofence.findMany({
      where: {
        tenantId: actor.tenantId,
        geofenceId: geofence.id,
        employeeId: { in: dto.employeeIds },
        deletedAt: null,
      },
      select: { id: true, employeeId: true },
    });

    if (rows.length === 0) {
      throw new NotFoundException({
        errorCode: 'GEOFENCE-004',
        message: 'None of these employees are assigned to this geofence.',
      });
    }

    await this.prisma.employeeGeofence.updateMany({
      where: { id: { in: rows.map((r) => r.id) }, tenantId: actor.tenantId },
      data: { deletedAt: new Date() },
    });

    const removedIds = rows.map((r) => r.employeeId);
    await this.geofenceCache.invalidateEmployees(actor.tenantId, removedIds);

    const remaining = await this.prisma.employeeGeofence.groupBy({
      by: ['employeeId'],
      where: {
        tenantId: actor.tenantId,
        employeeId: { in: removedIds },
        deletedAt: null,
      },
      _count: { _all: true },
    });
    const stillAssigned = new Set(remaining.map((r) => r.employeeId));
    const leftWithoutGeofence = removedIds.filter(
      (id) => !stillAssigned.has(id),
    );

    void this.auditService.log({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      module: 'ATTENDANCE',
      entityName: 'employee_geofence',
      entityId: geofence.id,
      action: 'UNASSIGN_EMPLOYEES',
      oldValue: { geofenceId: geofence.id, employeeIds: removedIds },
      newValue: { leftWithoutGeofence },
    });

    return {
      geofenceId: geofence.id,
      removed: rows.length,
      /** These employees can no longer punch anywhere until reassigned. */
      leftWithoutGeofence,
    };
  }

  /** Geofences one employee is assigned to — powers the employee detail view. */
  async listForEmployee(actor: Actor, employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: actor.tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const rows = await this.prisma.employeeGeofence.findMany({
      where: {
        tenantId: actor.tenantId,
        employeeId: employee.id,
        deletedAt: null,
        geofence: { deletedAt: null, active: true },
      },
      select: {
        assignedAt: true,
        geofence: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
          },
        },
      },
    });

    return {
      employeeId: employee.id,
      geofences: rows.map((r) => ({ ...r.geofence, assignedAt: r.assignedAt })),
      /** True means this employee is currently blocked from punching. */
      hasNoGeofence: rows.length === 0,
    };
  }

  /**
   * Tenant-wide coverage summary for the geofence list screen: assigned counts
   * per geofence plus how many active employees hold no assignment at all.
   */
  async coverageSummary(actor: Actor) {
    const [counts, totalEmployees, assignedEmployees] = await Promise.all([
      this.prisma.employeeGeofence.groupBy({
        by: ['geofenceId'],
        where: {
          tenantId: actor.tenantId,
          deletedAt: null,
          employee: { deletedAt: null, employmentStatus: 'ACTIVE' },
        },
        _count: { _all: true },
      }),
      this.prisma.employee.count({
        where: {
          tenantId: actor.tenantId,
          deletedAt: null,
          employmentStatus: 'ACTIVE',
        },
      }),
      this.prisma.employeeGeofence.groupBy({
        by: ['employeeId'],
        where: {
          tenantId: actor.tenantId,
          deletedAt: null,
          employee: { deletedAt: null, employmentStatus: 'ACTIVE' },
        },
        _count: { _all: true },
      }),
    ]);

    return {
      countsByGeofence: Object.fromEntries(
        counts.map((c) => [c.geofenceId, c._count._all]),
      ),
      totalEmployees,
      unassignedEmployees: totalEmployees - assignedEmployees.length,
      tenantHasEmployees: totalEmployees > 0,
    };
  }
}
