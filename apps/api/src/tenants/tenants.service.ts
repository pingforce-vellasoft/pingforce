import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { IPrismaService } from '@pingforce-monorepo/shared';
import * as argon2 from 'argon2';
import { syncSystemRolePermissions } from '../rbac/permission-catalog';
import { seedDefaultNotificationTemplates } from '../notifications/default-templates';
import { NotificationsService } from '../notifications/notifications.service';
import { generateStrongPassword } from '../common/utils/password-generator';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(data: any) {
    if (!data.adminEmail) {
      throw new BadRequestException(
        'Admin email is required to provision a tenant.',
      );
    }

    // Super Admin never types a password: one is generated server-side and the
    // admin is forced to rotate it on first login (mustChangePassword below).
    const adminPassword: string =
      typeof data.adminPassword === 'string' && data.adminPassword.length > 0
        ? data.adminPassword
        : generateStrongPassword();

    if (!data.code) {
      const prefix = data.name
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 3)
        .toUpperCase()
        .padEnd(3, 'X');
      const randomNum = Math.floor(100 + Math.random() * 900);
      data.code = `${prefix}${randomNum}`;
    }

    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existingCode = await this.prisma.tenant.findUnique({
        where: { code: data.code },
      });
      if (!existingCode) {
        isCodeUnique = true;
      } else {
        const prefix = data.name
          .replace(/[^a-zA-Z]/g, '')
          .substring(0, 3)
          .toUpperCase()
          .padEnd(3, 'X');
        const randomNum = Math.floor(100 + Math.random() * 900);
        data.code = `${prefix}${randomNum}`;
      }
    }

    const passwordHash = await argon2.hash(adminPassword);

    const tenant = await this.prisma.$transaction(async (prisma) => {
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
        },
      });

      let adminRole = await prisma.role.findFirst({
        where: { tenantId: tenant.id, code: 'ADMIN_MANAGER' },
      });

      if (!adminRole) {
        adminRole = await prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: 'Admin / Manager',
            code: 'ADMIN_MANAGER',
            description: 'Management access',
            isSystem: true,
          },
        });
      }

      let employeeRole = await prisma.role.findFirst({
        where: { tenantId: tenant.id, code: 'EMPLOYEE' },
      });

      if (!employeeRole) {
        employeeRole = await prisma.role.create({
          data: {
            tenantId: tenant.id,
            name: 'Employee',
            code: 'EMPLOYEE',
            description: 'Standard employee access',
            isSystem: true,
          },
        });
      }

      // Grant the standard permission sets from the shared catalog
      await syncSystemRolePermissions(prisma, adminRole.id, 'ADMIN_MANAGER');
      await syncSystemRolePermissions(prisma, employeeRole.id, 'EMPLOYEE');

      // Default notification templates — without these every business email
      // (visits/leads/faults) is silently skipped by NotificationsService.
      await seedDefaultNotificationTemplates(prisma, tenant.id);

      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          email: data.adminEmail,
          passwordHash: passwordHash,
          profile: {
            create: {
              firstName: 'Tenant',
              lastName: 'Admin',
            },
          },
          status: 'ACTIVE',
          clientCode: 'TENANT_ADMIN',
          // Super-admin picked this password; force a rotation on first login.
          mustChangePassword: true,
        },
      });

      return tenant;
    });

    // Sent after the transaction commits so a failed provision never emails a
    // tenant that does not exist, and a slow/unreachable SMTP never rolls back
    // the tenant. The workspace has no per-tenant email provider yet, so this
    // welcome goes out over the global (system) SMTP transport.
    await this.sendWelcomeInvite(
      tenant.id,
      data.adminEmail,
      tenant.name,
      tenant.code,
      adminPassword,
    );

    return tenant;
  }

  /**
   * Onboarding email to a freshly provisioned tenant admin: their workspace ID,
   * sign-in credentials, the admin web portal link, and the mobile app store
   * links. The same account signs in on both web and the mobile app.
   */
  private async sendWelcomeInvite(
    tenantId: string,
    email: string,
    workspaceName: string,
    workspaceCode: string,
    tempPassword: string,
  ): Promise<void> {
    const webUrl = process.env.ADMIN_WEB_URL ?? 'https://admin.pingforce.in';
    const androidUrl =
      process.env.MOBILE_ANDROID_URL ??
      'https://play.google.com/store/apps/details?id=in.pingforce.app';

    try {
      await this.notifications.sendRawEmail(
        email,
        `Welcome to PingForce — your ${workspaceName} workspace is ready`,
        `<p>Hello,</p>
         <p>Your PingForce workspace <strong>${workspaceName}</strong> has been
         created. Use the credentials below to sign in — the same account works
         on both the web portal and the mobile app.</p>
         <ul>
           <li><strong>Workspace ID:</strong> ${workspaceCode}</li>
           <li><strong>Email:</strong> ${email}</li>
           <li><strong>Temporary password:</strong> ${tempPassword}</li>
         </ul>
         <p><strong>Admin web portal:</strong>
           <a href="${webUrl}">${webUrl}</a></p>
         <p><strong>Mobile app (Android):</strong>
           <a href="${androidUrl}">Get it on Google Play</a></p>
         <p>You must change this temporary password the first time you sign in.</p>`,
        tenantId,
      );
    } catch (error) {
      // Never fail tenant provisioning because the welcome email could not be
      // delivered — the tenant exists and the admin can be re-invited.
      this.logger.error(
        `Failed to send welcome invite to ${email} for tenant ${tenantId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
    });
  }

  async updateProvisioning(
    id: string,
    isAttendanceEnabled: boolean,
    maxFieldStaff: number | null,
  ) {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        isAttendanceEnabled,
        maxFieldStaff,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'SUSPENDED' },
    });
  }
}
