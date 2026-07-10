import { Injectable, Inject } from '@nestjs/common';
import { PrismaRepository } from './prisma.repository';

// We abstract the Prisma Employee Delegate type for type safety
type PrismaEmployeeDelegate = {
  create: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any[]>;
  findFirst: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
};

@Injectable()
export class EmployeeRepository extends PrismaRepository<
  any, // We can type these tighter once Prisma generated types are imported, but any works for generic structure
  any,
  any,
  PrismaEmployeeDelegate
> {
  constructor(@Inject('IPrismaService') private readonly prismaService: any) {
    super(prismaService.employee);
  }

  // Extend base repository with specialized methods
  async findAllWithRelations(tenantId: string, limit: number, cursor?: string) {
    return this.prismaService.employee.findMany({
      where: { tenantId },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        department: true,
        designation: true,
        team: true
      }
    });
  }

  async findOneWithRelations(tenantId: string, id: string) {
    return this.prismaService.employee.findFirst({
      where: { id, tenantId },
      include: {
        company: true,
        department: true,
        designation: true,
        branch: true,
        team: true,
        reportingManager: true
      }
    });
  }
}
