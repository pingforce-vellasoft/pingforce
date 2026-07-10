import { Injectable, Inject } from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';

@Injectable()
export class RbacService {
  constructor(
    @Inject('IPrismaService') private prisma: IPrismaService
  ) {}

  async hasPermission(userId: string, module: string, action: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.role) {
      return false; // No role assigned
    }

    // Bypass permission check for SUPER_ADMIN
    if (user.role.code === 'SUPER_ADMIN') {
      return true;
    }

    // Check if any of the user's role permissions match the requested module and action
    const hasPerm = user.role.permissions.some(
      (rp) => rp.permission.module === module && rp.permission.action === action
    );

    return hasPerm;
  }

  async findAllRoles(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  async createRole(tenantId: string, data: { name: string; code: string; description?: string; permissionIds?: string[] }) {
    return this.prisma.role.create({
      data: {
        tenantId,
        name: data.name,
        code: data.code,
        description: data.description,
        permissions: data.permissionIds && data.permissionIds.length > 0 ? {
          create: data.permissionIds.map(permId => ({
            permissionId: permId,
            dataScope: 'OWN'
          }))
        } : undefined
      },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  async updateRole(tenantId: string, roleId: string, data: { name: string; description?: string }) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId }
    });
    
    if (!role) {
      throw new Error('Role not found in this tenant');
    }

    if (role.isSystem) {
      throw new Error('Cannot edit system roles');
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: data.name,
        description: data.description
      }
    });
  }

  async findAllPermissions(tenantId?: string) {
    if (tenantId && tenantId !== 'SYSTEM') {
      const allowedModules = ['USERS', 'ROLES', 'GEOFENCES', 'ATTENDANCE', 'TRACKING'];
      return this.prisma.permission.findMany({
        where: { module: { in: allowedModules } }
      });
    }
    return this.prisma.permission.findMany();
  }

  async updateRolePermissions(tenantId: string, roleId: string, permissionIds: string[]) {
    // First, verify the role belongs to the tenant
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId }
    });
    
    if (!role) {
      throw new Error('Role not found in this tenant');
    }

    // Delete existing permissions for this role
    await this.prisma.rolePermission.deleteMany({
      where: { roleId }
    });

    // Insert new permissions
    if (permissionIds && permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId,
          permissionId,
          dataScope: 'OWN' // Default scope
        }))
      });
    }

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }

  async deleteRole(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { users: true } } }
    });

    if (!role) {
      throw new Error('Role not found in this tenant');
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system roles');
    }

    if (role._count.users > 0) {
      throw new Error('Cannot delete a role that is assigned to users. Reassign users first.');
    }

    // RolePermission records might have a foreign key constraint or we just delete them explicitly
    await this.prisma.rolePermission.deleteMany({
      where: { roleId }
    });

    return this.prisma.role.delete({
      where: { id: roleId }
    });
  }
}
