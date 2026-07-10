import { Injectable, Inject, OnModuleInit, BadRequestException } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import * as argon2 from 'argon2';

@Injectable()
export class TenantsService implements OnModuleInit {
  constructor(@Inject('IPrismaService') private readonly prisma: IPrismaService) {}

  async onModuleInit() {
    await this.prisma.tenant.updateMany({
      data: {
        legalName: 'PingForce Solutions Pvt. Ltd.',
        industry: 'Technology',
        contactEmail: 'contact@pingforce.com',
        contactPhone: '+91 9876543210',
        currency: 'INR',
        country: 'India',
        taxId: 'GSTIN123456789',
        billingEmail: 'billing@pingforce.com',
        subscriptionPlan: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        themeColor: '#6366f1'
      }
    });
  }

  async create(data: any) {
    if (!data.adminEmail || !data.adminPassword) {
      throw new BadRequestException('Admin email and password are required to provision a tenant.');
    }

    if (!data.code) {
      const prefix = data.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
      const randomNum = Math.floor(100 + Math.random() * 900);
      data.code = `${prefix}${randomNum}`;
    }

    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existingCode = await this.prisma.tenant.findUnique({ where: { code: data.code } });
      if (!existingCode) {
        isCodeUnique = true;
      } else {
        const prefix = data.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
        const randomNum = Math.floor(100 + Math.random() * 900);
        data.code = `${prefix}${randomNum}`;
      }
    }

    const passwordHash = await argon2.hash(data.adminPassword);

    return this.prisma.$transaction(async (prisma) => {
      const tenant = await prisma.tenant.create({
        data: {
          name: data.name,
          code: data.code,
          legalName: data.legalName || data.name,
          industry: data.industry || 'Other',
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          country: data.country || null,
          currency: data.currency || 'USD',
          subscriptionPlan: data.subscriptionPlan || 'BASIC',
          subscriptionStatus: 'TRIAL',
          themeColor: data.themeColor || '#6366f1',
          isAttendanceEnabled: data.isAttendanceEnabled || false,
        }
      });

      let adminRole = await prisma.role.findFirst({
        where: { tenantId: tenant.id, code: 'ADMIN_MANAGER' }
      });

      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: 'Admin / Manager',
            code: 'ADMIN_MANAGER',
            description: 'Management access',
            isSystem: true
          }
        });
      }

      let employeeRole = await prisma.role.findFirst({
        where: { tenantId: tenant.id, code: 'EMPLOYEE' }
      });

      if (!employeeRole) {
        employeeRole = await prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: 'Employee',
            code: 'EMPLOYEE',
            description: 'Standard employee access',
            isSystem: true
          }
        });
      }

      const allPermissions = await prisma.permission.findMany();
      
      const adminModules = ['USERS', 'ROLES', 'GEOFENCES', 'ATTENDANCE', 'TRACKING'];
      const adminPerms = allPermissions.filter(p => adminModules.includes(p.module));
      const adminRolePerms = adminPerms.map(p => ({ roleId: adminRole.id, permissionId: p.id }));
      
      await prisma.rolePermission.createMany({
        data: adminRolePerms,
        skipDuplicates: true
      });

      const employeePerms = allPermissions.filter(p => 
        p.module === 'ATTENDANCE' && ['READ_OWN', 'CREATE'].includes(p.action)
      );
      const employeeRolePerms = employeePerms.map(p => ({ roleId: employeeRole.id, permissionId: p.id }));
      await prisma.rolePermission.createMany({
        data: employeeRolePerms,
        skipDuplicates: true
      });

      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          email: data.adminEmail,
          passwordHash: passwordHash,
          profile: {
            create: {
              firstName: 'Tenant',
              lastName: 'Admin'
            }
          },
          status: 'ACTIVE',
          clientCode: 'TENANT_ADMIN'
        }
      });

      return tenant;
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id }
    });
  }

  async updateProvisioning(id: string, isAttendanceEnabled: boolean, maxFieldStaff: number | null) {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        isAttendanceEnabled,
        maxFieldStaff
      }
    });
  }

  async update(id: string, data: any) {
    return this.prisma.tenant.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'SUSPENDED' }
    });
  }
}
