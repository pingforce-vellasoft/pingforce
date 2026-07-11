import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create Granular Permissions
  const permissionsData = [
    // Tenants (Super Admin Only)
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
    // Billing (Super Admin Only)
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
    // Platform Settings (Super Admin Only)
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
    // Geofences (Tenant Admin)
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
    // Attendance (Tenant Admin / Field Agent)
    {
      module: 'ATTENDANCE',
      action: 'READ',
      description: 'View all attendance logs across the tenant',
    },
    {
      module: 'ATTENDANCE',
      action: 'APPROVE',
      description: 'Approve or reject leave requests and punch anomalies',
    },
    {
      module: 'ATTENDANCE',
      action: 'READ_OWN',
      description: 'View own attendance logs and history',
    },
    {
      module: 'ATTENDANCE',
      action: 'CREATE',
      description: 'Punch in/out and submit leave requests',
    },
    // Tickets & Tasks
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
    // Live Tracking
    {
      module: 'TRACKING',
      action: 'VIEW_LIVE',
      description: 'View live agent locations on the map',
    },
  ];

  for (const p of permissionsData) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: { description: p.description },
      create: p,
    });
  }
  console.log('Upserted granular system permissions');

  // 2. Create Super Admin User
  const passwordHash = await argon2.hash('Admin@123');
  const admin = await prisma.superAdmin.upsert({
    where: {
      email: 'admin@pingforce.in',
    },
    update: {
      passwordHash: passwordHash,
    },
    create: {
      email: 'admin@pingforce.in',
      name: 'Super Admin',
      passwordHash: passwordHash,
      status: 'ACTIVE',
    },
  });

  console.log(`Upserted super admin user: ${admin.email}`);
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
