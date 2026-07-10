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
];

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (softDeleteModels.includes(model)) {
            if (operation === 'delete') {
              return (client as any)[model].update({
                where: (args as any).where,
                data: { deletedAt: new Date() },
              });
            }
            if (operation === 'deleteMany') {
              return (client as any)[model].updateMany({
                where: (args as any).where,
                data: { deletedAt: new Date() },
              });
            }
            if (operation === 'findUnique' || operation === 'findFirst') {
              const result = await query(args);
              if (result && (result as any).deletedAt) return null;
              return result;
            }
            if (operation === 'findMany' || operation === 'count') {
              const anyArgs = args as any;
              anyArgs.where = anyArgs.where ? { ...anyArgs.where } : {};
              if (anyArgs.where.deletedAt === undefined) {
                anyArgs.where.deletedAt = null;
              }
            }
          }
          return query(args);
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
