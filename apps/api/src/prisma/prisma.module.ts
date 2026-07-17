import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const softDeleteModels = [
  'Tenant',
  'User',
  'UserProfile',
  'Company',
  'Department',
  'Designation',
  'Branch',
  'LeaveType',
  'Employee',
  'Customer',
  'PipelineStage',
  'LeadStatus',
  'Lead',
  'Shift',
  'Attendance',
  'AttendanceSession',
  'Team',
  'LeadSource',
  'Campaign',
  'LeadPriority',
  'AttendancePolicy',
  'LeaveBalance',
  'LeaveRequest',
  'AttendanceBreak',
  'AttendanceCorrection',
  'ShiftAssignment',
  'Geofence',
  'Visit',
  'VisitNote',
];

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  // Bounded pool so a burst (morning check-in rush) queues instead of
  // exhausting PostgreSQL's max_connections. Tune via env per instance.
  const pool = new Pool({
    connectionString,
    max: parseInt(process.env.DB_POOL_MAX ?? '30', 10),
    idleTimeoutMillis: parseInt(
      process.env.DB_POOL_IDLE_TIMEOUT ?? '30000',
      10,
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DB_POOL_CONNECTION_TIMEOUT ?? '5000',
      10,
    ),
  });
  // Prevent one bad connection (network blip, server restart) from
  // crashing the process via an unhandled 'error' event.
  pool.on('error', (err) => {
    console.error('pg pool idle client error', err);
  });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  // Soft-delete enforcement (SOFT_DELETE.md §9): operational queries exclude
  // deleted rows by default; passing an explicit `deletedAt` filter opts out
  // (restore/admin flows). `delete`/`deleteMany` become logical deletes.
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!softDeleteModels.includes(model)) {
            return query(args);
          }

          const anyArgs = (args ?? {}) as any;

          switch (operation) {
            // Logical delete. Note: runs on the base client — services doing
            // transactional deletes must call update({deletedAt}) explicitly
            // inside the transaction instead of delete().
            case 'delete': {
              return (client as any)[model].update({
                where: anyArgs.where,
                data: { deletedAt: new Date() },
              });
            }
            case 'deleteMany': {
              return (client as any)[model].updateMany({
                where: { ...(anyArgs.where ?? {}), deletedAt: null },
                data: { deletedAt: new Date() },
              });
            }

            // Reads: inject the filter into the query args (not post-filter),
            // so explicit deletedAt filters (restore flows) keep working.
            case 'findFirst':
            case 'findMany':
            case 'count':
            case 'aggregate':
            case 'groupBy': {
              anyArgs.where = anyArgs.where ? { ...anyArgs.where } : {};
              if (anyArgs.where.deletedAt === undefined) {
                anyArgs.where.deletedAt = null;
              }
              return query(anyArgs);
            }

            // Unique lookups cannot take non-unique filters — post-check.
            case 'findUnique':
            case 'findUniqueOrThrow': {
              const result = await query(args);
              if (result && (result as any).deletedAt) return null;
              return result;
            }

            // Guard mutations from silently resurrecting/affecting deleted rows.
            case 'updateMany': {
              anyArgs.where = anyArgs.where ? { ...anyArgs.where } : {};
              if (anyArgs.where.deletedAt === undefined) {
                anyArgs.where.deletedAt = null;
              }
              return query(anyArgs);
            }

            default:
              return query(args);
          }
        },
      },
    },
  });
}

export type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const prismaClientProvider = {
  provide: 'IPrismaService',
  useFactory: () => {
    const client = createPrismaClient();
    // Eagerly connect on app start
    (client as any).$connect();
    return client;
  },
};

@Global()
@Module({
  providers: [prismaClientProvider],
  exports: ['IPrismaService'],
})
export class PrismaModule {}
