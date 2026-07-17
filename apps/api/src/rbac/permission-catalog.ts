/**
 * Single source of truth for the tenant permission catalog and the
 * permissions granted to the built-in system roles.
 *
 * Consumed by:
 *  - prisma/seed.ts (catalog upsert + backfill of existing tenant roles)
 *  - TenantsService / AuthService (grants on tenant/role provisioning)
 *
 * Pure constants only — no NestJS or Prisma imports, so it is safe to
 * import from the seed script.
 */

export interface PermissionDef {
  readonly module: string;
  readonly action: string;
  readonly description: string;
}

export const PERMISSION_CATALOG: readonly PermissionDef[] = [
  // Tenants (Super Admin only)
  {
    module: 'TENANTS',
    action: 'READ',
    description: 'View list of tenants and their details',
  },
  {
    module: 'TENANTS',
    action: 'CREATE',
    description: 'Create new tenants on the platform',
  },
  {
    module: 'TENANTS',
    action: 'UPDATE',
    description: 'Modify tenant configuration and settings',
  },
  {
    module: 'TENANTS',
    action: 'DELETE',
    description: 'Delete or disable tenants',
  },
  // Billing (Super Admin only)
  {
    module: 'BILLING',
    action: 'READ',
    description: 'View platform billing and subscriptions',
  },
  {
    module: 'BILLING',
    action: 'UPDATE',
    description: 'Modify subscription plans and invoices',
  },
  // Platform Settings (Super Admin only)
  {
    module: 'SETTINGS',
    action: 'READ',
    description: 'View global platform settings (Map integrations, etc)',
  },
  {
    module: 'SETTINGS',
    action: 'UPDATE',
    description: 'Update global platform settings',
  },
  // Users & Roles (Tenant Admin)
  {
    module: 'USERS',
    action: 'READ',
    description: 'View users within the tenant',
  },
  { module: 'USERS', action: 'CREATE', description: 'Provision new users' },
  {
    module: 'USERS',
    action: 'UPDATE',
    description: 'Modify user details and disable accounts',
  },
  {
    module: 'USERS',
    action: 'DELETE',
    description: 'Permanently delete user accounts',
  },
  {
    module: 'ROLES',
    action: 'READ',
    description: 'View roles and their assigned permissions',
  },
  { module: 'ROLES', action: 'CREATE', description: 'Create custom roles' },
  {
    module: 'ROLES',
    action: 'UPDATE',
    description: 'Modify role permissions and details',
  },
  { module: 'ROLES', action: 'DELETE', description: 'Delete custom roles' },
  // Geofences
  {
    module: 'GEOFENCES',
    action: 'READ',
    description: 'View geofences and restrictions',
  },
  {
    module: 'GEOFENCES',
    action: 'CREATE',
    description: 'Draw and create new geofences',
  },
  {
    module: 'GEOFENCES',
    action: 'UPDATE',
    description: 'Modify geofence boundaries',
  },
  { module: 'GEOFENCES', action: 'DELETE', description: 'Remove geofences' },
  // Attendance
  {
    module: 'ATTENDANCE',
    action: 'READ',
    description: 'View all attendance logs across the tenant',
  },
  {
    module: 'ATTENDANCE',
    action: 'APPROVE',
    description:
      'Approve or reject punch anomalies, manual checkouts and device revocations',
  },
  {
    module: 'ATTENDANCE',
    action: 'READ_OWN',
    description: 'View own attendance logs and history',
  },
  {
    module: 'ATTENDANCE',
    action: 'CREATE',
    description: 'Punch in/out and register own device',
  },
  // Employees
  { module: 'EMPLOYEES', action: 'READ', description: 'View employee records' },
  {
    module: 'EMPLOYEES',
    action: 'CREATE',
    description: 'Create employee records',
  },
  {
    module: 'EMPLOYEES',
    action: 'UPDATE',
    description: 'Update employee records',
  },
  {
    module: 'EMPLOYEES',
    action: 'DELETE',
    description: 'Delete employee records',
  },
  // Customers
  { module: 'CUSTOMERS', action: 'READ', description: 'View customer records' },
  {
    module: 'CUSTOMERS',
    action: 'CREATE',
    description: 'Create customer records',
  },
  {
    module: 'CUSTOMERS',
    action: 'UPDATE',
    description: 'Update customer records',
  },
  {
    module: 'CUSTOMERS',
    action: 'DELETE',
    description: 'Delete customer records',
  },
  // Leads
  {
    module: 'LEADS',
    action: 'READ',
    description: 'View leads and the sales pipeline',
  },
  { module: 'LEADS', action: 'CREATE', description: 'Create leads' },
  {
    module: 'LEADS',
    action: 'UPDATE',
    description: 'Update leads, stages and ownership',
  },
  { module: 'LEADS', action: 'DELETE', description: 'Delete leads' },
  {
    module: 'LEADS',
    action: 'CONVERT',
    description: 'Convert qualified leads into customers',
  },
  // Faults / tickets
  {
    module: 'FAULTS',
    action: 'READ',
    description: 'View all faults across the tenant',
  },
  {
    module: 'FAULTS',
    action: 'READ_OWN',
    description: 'View faults assigned to self',
  },
  { module: 'FAULTS', action: 'CREATE', description: 'Create faults' },
  {
    module: 'FAULTS',
    action: 'UPDATE',
    description: 'Update fault details and status',
  },
  { module: 'FAULTS', action: 'ESCALATE', description: 'Escalate faults' },
  { module: 'FAULTS', action: 'DELETE', description: 'Delete faults' },
  // Leave
  {
    module: 'LEAVES',
    action: 'READ',
    description: 'View all leave requests across the tenant',
  },
  {
    module: 'LEAVES',
    action: 'READ_OWN',
    description: 'View own leave requests and balances',
  },
  { module: 'LEAVES', action: 'CREATE', description: 'Submit leave requests' },
  {
    module: 'LEAVES',
    action: 'APPROVE',
    description: 'Approve or reject leave requests',
  },
  // Expense claims
  {
    module: 'CLAIMS',
    action: 'READ',
    description: 'View expense claims across the tenant',
  },
  {
    module: 'CLAIMS',
    action: 'CREATE',
    description: 'Submit own expense claims',
  },
  {
    module: 'CLAIMS',
    action: 'APPROVE',
    description: 'Approve or reject expense claims',
  },
  // Payroll
  {
    module: 'PAYROLL',
    action: 'READ',
    description: 'View payroll cycles and payslips',
  },
  {
    module: 'PAYROLL',
    action: 'CREATE',
    description: 'Create salary structures, cycles and generate payslips',
  },
  // Shifts
  {
    module: 'SHIFTS',
    action: 'READ',
    description: 'View shifts and assignments',
  },
  {
    module: 'SHIFTS',
    action: 'READ_OWN',
    description: 'View own shift assignment',
  },
  { module: 'SHIFTS', action: 'CREATE', description: 'Create shifts' },
  {
    module: 'SHIFTS',
    action: 'ASSIGN',
    description: 'Assign shifts to employees',
  },
  // Master data
  {
    module: 'MASTER_DATA',
    action: 'READ',
    description: 'View master data (leave types, categories, sources, …)',
  },
  {
    module: 'MASTER_DATA',
    action: 'CREATE',
    description: 'Create master data entries',
  },
  {
    module: 'MASTER_DATA',
    action: 'UPDATE',
    description: 'Update master data entries',
  },
  {
    module: 'MASTER_DATA',
    action: 'DELETE',
    description: 'Delete master data entries',
  },
  // Tasks / tickets (mobile, legacy catalog entries kept)
  { module: 'TASKS', action: 'READ_OWN', description: 'View assigned tasks' },
  {
    module: 'TASKS',
    action: 'UPDATE_STATUS',
    description: 'Update task progress and completion status',
  },
  {
    module: 'TICKETS',
    action: 'READ_OWN',
    description: 'View own submitted tickets',
  },
  {
    module: 'TICKETS',
    action: 'CREATE',
    description: 'Submit new support tickets or service requests',
  },
  // GPS visits (3.2_GPSVisitManagement/RBAC.md)
  {
    module: 'VISITS',
    action: 'READ',
    description: 'View all visits across the tenant',
  },
  {
    module: 'VISITS',
    action: 'READ_OWN',
    description: 'View visits assigned to self',
  },
  { module: 'VISITS', action: 'CREATE', description: 'Plan and create visits' },
  {
    module: 'VISITS',
    action: 'UPDATE',
    description: 'Edit visit details and cancel visits',
  },
  {
    module: 'VISITS',
    action: 'ASSIGN',
    description: 'Assign or reassign visits to employees',
  },
  {
    module: 'VISITS',
    action: 'EXECUTE',
    description:
      'Execute own visits (accept, start, pause, complete, offline sync)',
  },
  {
    module: 'VISITS',
    action: 'APPROVE',
    description: 'Review, approve, close and reopen completed visits',
  },
  { module: 'VISITS', action: 'DELETE', description: 'Delete visits' },
  // Reports & analytics (3.5_ReportsAnalytics/RBAC.md)
  {
    module: 'REPORTS',
    action: 'READ',
    description: 'View reports, dashboards and KPIs',
  },
  {
    module: 'REPORTS',
    action: 'EXPORT',
    description: 'Export reports (CSV)',
  },
  // Live tracking
  {
    module: 'TRACKING',
    action: 'VIEW_LIVE',
    description: 'View live agent locations on the map',
  },
  // Audit trail
  {
    module: 'AUDIT',
    action: 'READ',
    description: 'View and search the tenant audit trail',
  },
  {
    module: 'AUDIT',
    action: 'EXPORT',
    description: 'Export the audit trail (CSV)',
  },
  {
    module: 'AUDIT',
    action: 'MANAGE',
    description: 'Configure audit retention and archive policies',
  },
  // Connection Map / network topology (3.7_ConnectionMap)
  {
    module: 'NETWORK',
    action: 'READ',
    description: 'View the connection map, OLTEs and all connections',
  },
  {
    module: 'NETWORK',
    action: 'READ_OWN',
    description: 'View assigned connections on the connection map',
  },
  {
    module: 'NETWORK',
    action: 'OLTE_MANAGE',
    description: 'Create, update and archive OLTEs',
  },
  {
    module: 'NETWORK',
    action: 'CREATE',
    description: 'Create customer connections',
  },
  {
    module: 'NETWORK',
    action: 'UPDATE',
    description: 'Update connection details, disconnect and reconnect',
  },
  {
    module: 'NETWORK',
    action: 'MOVE',
    description: 'Move, split and merge connections (topology changes)',
  },
  {
    module: 'NETWORK',
    action: 'DELETE',
    description: 'Archive connections',
  },
  // Customer Portal user management (3.8_CustomerPortal)
  {
    module: 'PORTAL_USERS',
    action: 'READ',
    description: 'View customer portal users and invites',
  },
  {
    module: 'PORTAL_USERS',
    action: 'CREATE',
    description: 'Invite customer contacts to the portal',
  },
  {
    module: 'PORTAL_USERS',
    action: 'UPDATE',
    description: 'Suspend, reactivate or change portal user roles',
  },
  {
    module: 'PORTAL_USERS',
    action: 'DELETE',
    description: 'Remove portal users and revoke invites',
  },
  // Workflow engine (ApprovalWorkflow.md)
  {
    module: 'WORKFLOWS',
    action: 'READ',
    description: 'View workflow definitions, delegations and instance history',
  },
  {
    module: 'WORKFLOWS',
    action: 'MANAGE',
    description: 'Configure approval workflows and delegations',
  },
  // Notification engine configuration (Email.md §5)
  {
    module: 'NOTIFICATIONS',
    action: 'MANAGE',
    description: 'Configure tenant notification providers (email/SMTP)',
  },
];

/** Modules that platform (super-admin) roles own; tenant roles never receive these. */
const PLATFORM_MODULES = ['TENANTS', 'BILLING', 'SETTINGS'] as const;

// Kept as an inline union (not imported from rbac.service) so prisma/seed.ts
// can consume this catalog without dragging in NestJS dependencies.
type GrantScope =
  | 'OWN'
  | 'CUSTOM'
  | 'TEAM'
  | 'DEPARTMENT'
  | 'BRANCH'
  | 'REGION'
  | 'BUSINESS_UNIT'
  | 'ALL';

interface GrantDef {
  readonly module: string;
  readonly action: string;
  readonly dataScope: GrantScope;
}

/** Every tenant-scope permission in the catalog, granted with ALL scope. */
const ADMIN_MANAGER_GRANTS: readonly GrantDef[] = PERMISSION_CATALOG.filter(
  (p) => !(PLATFORM_MODULES as readonly string[]).includes(p.module),
).map((p) => ({
  module: p.module,
  action: p.action,
  dataScope: 'ALL' as const,
}));

/** Self-service subset for employee-facing roles (mobile app). */
const EMPLOYEE_GRANTS: readonly GrantDef[] = [
  { module: 'ATTENDANCE', action: 'READ_OWN', dataScope: 'OWN' },
  { module: 'ATTENDANCE', action: 'CREATE', dataScope: 'OWN' },
  { module: 'LEAVES', action: 'READ_OWN', dataScope: 'OWN' },
  { module: 'LEAVES', action: 'CREATE', dataScope: 'OWN' },
  { module: 'CLAIMS', action: 'CREATE', dataScope: 'OWN' },
  { module: 'FAULTS', action: 'READ_OWN', dataScope: 'OWN' },
  { module: 'FAULTS', action: 'CREATE', dataScope: 'OWN' },
  { module: 'FAULTS', action: 'UPDATE', dataScope: 'OWN' },
  { module: 'VISITS', action: 'READ_OWN', dataScope: 'OWN' },
  { module: 'VISITS', action: 'EXECUTE', dataScope: 'OWN' },
  { module: 'SHIFTS', action: 'READ_OWN', dataScope: 'OWN' },
  { module: 'MASTER_DATA', action: 'READ', dataScope: 'OWN' },
  { module: 'GEOFENCES', action: 'READ', dataScope: 'OWN' },
  // Connection Map: assigned-route visibility only; tenant admin may grant
  // more, capped by the Super Admin employee-access ceiling (3.7 §6).
  { module: 'NETWORK', action: 'READ_OWN', dataScope: 'OWN' },
  { module: 'TASKS', action: 'READ_OWN', dataScope: 'OWN' },
  { module: 'TASKS', action: 'UPDATE_STATUS', dataScope: 'OWN' },
  { module: 'TICKETS', action: 'READ_OWN', dataScope: 'OWN' },
  { module: 'TICKETS', action: 'CREATE', dataScope: 'OWN' },
];

/** Permissions each built-in system role receives at provisioning time. */
export const SYSTEM_ROLE_GRANTS: Readonly<Record<string, readonly GrantDef[]>> =
  {
    ADMIN_MANAGER: ADMIN_MANAGER_GRANTS,
    EMPLOYEE: EMPLOYEE_GRANTS,
    EMPLOYEE_FIELD_STAFF: EMPLOYEE_GRANTS,
  };

/**
 * Minimal structural type so both the Prisma client (seed) and the
 * IPrismaService transaction client (API) can be passed in.
 */
interface PermissionDbClient {
  permission: {
    findMany(args: {
      where: { OR: { module: string; action: string }[] };
    }): Promise<{ id: string; module: string; action: string }[]>;
  };
  rolePermission: {
    createMany(args: {
      data: { roleId: string; permissionId: string; dataScope: string }[];
      skipDuplicates: boolean;
    }): Promise<unknown>;
  };
}

/**
 * Idempotently attaches the system-role grant set to a role.
 * No-op for role codes without an entry in SYSTEM_ROLE_GRANTS.
 */
export async function syncSystemRolePermissions(
  db: PermissionDbClient,
  roleId: string,
  roleCode: string,
): Promise<void> {
  const grants = SYSTEM_ROLE_GRANTS[roleCode];
  if (!grants || grants.length === 0) {
    return;
  }

  const permissions = await db.permission.findMany({
    where: { OR: grants.map((g) => ({ module: g.module, action: g.action })) },
  });

  const scopeByKey = new Map(
    grants.map((g) => [`${g.module}:${g.action}`, g.dataScope]),
  );

  await db.rolePermission.createMany({
    data: permissions.map((p) => ({
      roleId,
      permissionId: p.id,
      dataScope: scopeByKey.get(`${p.module}:${p.action}`) ?? 'OWN',
    })),
    skipDuplicates: true,
  });
}
