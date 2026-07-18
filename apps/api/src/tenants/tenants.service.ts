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
      // The provisioned admin always lands in the ADMIN_MANAGER role; the deep
      // link carries it so the app can pre-select the right sign-in context.
      'ADMIN_MANAGER',
    );

    return tenant;
  }

  /**
   * Onboarding email to a freshly provisioned tenant admin: their workspace ID,
   * sign-in credentials, a one-tap deep link that opens the mobile app with the
   * workspace (and role) pre-filled, the app-store links to install it, and the
   * admin web portal. The same account signs in on both web and the mobile app.
   */
  private async sendWelcomeInvite(
    tenantId: string,
    email: string,
    workspaceName: string,
    workspaceCode: string,
    tempPassword: string,
    roleCode: string,
  ): Promise<void> {
    const webUrl = process.env.ADMIN_WEB_URL ?? 'https://admin.pingforce.in';
    const androidUrl =
      process.env.MOBILE_ANDROID_URL ??
      'https://play.google.com/store/apps/details?id=com.vellasoft.pingforce';
    const iosUrl =
      process.env.MOBILE_IOS_URL ??
      'https://apps.apple.com/app/pingforce/id0000000000';

    // Custom-scheme deep link — opens the installed app straight onto the login
    // screen with the workspace code (and role) already filled in. Carries no
    // secret, so it is safe to embed in an email. `pingforce://` needs no hosted
    // domain-verification file (unlike App Links / Universal Links).
    const inviteUrl =
      `pingforce://invite?workspace=${encodeURIComponent(workspaceCode)}` +
      `&role=${encodeURIComponent(roleCode)}`;

    try {
      await this.notifications.sendRawEmail(
        email,
        `Welcome to PingForce — your ${workspaceName} workspace is ready`,
        this.buildWelcomeEmailHtml({
          workspaceName,
          workspaceCode,
          email,
          tempPassword,
          inviteUrl,
          webUrl,
          androidUrl,
          iosUrl,
        }),
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

  /**
   * Table-based, inline-styled responsive HTML — the layout mail clients
   * (Gmail/Outlook/Apple Mail) render reliably. No external CSS or web fonts.
   */
  private buildWelcomeEmailHtml(p: {
    workspaceName: string;
    workspaceCode: string;
    email: string;
    tempPassword: string;
    inviteUrl: string;
    webUrl: string;
    androidUrl: string;
    iosUrl: string;
  }): string {
    const brand = '#6366f1';
    const ink = '#111827';
    const muted = '#6b7280';
    const line = '#e5e7eb';
    const bg = '#f3f4f6';
    const card = '#ffffff';

    const credRow = (label: string, value: string): string => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid ${line};font-size:13px;color:${muted};">${label}</td>
        <td style="padding:10px 16px;border-bottom:1px solid ${line};font-size:14px;color:${ink};font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-weight:600;">${value}</td>
      </tr>`;

    return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};margin:0;padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${card};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:${brand};padding:28px 32px;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">⚡ PingForce</span>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h1 style="margin:0 0 8px 0;font-size:20px;color:${ink};font-family:Arial,Helvetica,sans-serif;">Your workspace is ready 🎉</h1>
            <p style="margin:0;font-size:14px;line-height:22px;color:${muted};font-family:Arial,Helvetica,sans-serif;">
              Workspace <strong style="color:${ink};">${p.workspaceName}</strong> has been created for you.
              The same account signs you in on both the web portal and the mobile app.
            </p>
          </td>
        </tr>

        <!-- Credentials card -->
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${line};border-radius:8px;overflow:hidden;">
              <tr><td colspan="2" style="padding:12px 16px;background:#f9fafb;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:${muted};font-family:Arial,Helvetica,sans-serif;">Sign-in details</td></tr>
              ${credRow('Workspace ID', p.workspaceCode)}
              ${credRow('Email', p.email)}
              ${credRow('Temporary password', p.tempPassword)}
            </table>
            <p style="margin:12px 2px 0 2px;font-size:12px;line-height:18px;color:${muted};font-family:Arial,Helvetica,sans-serif;">
              🔒 You'll be asked to set a new password the first time you sign in.
            </p>
          </td>
        </tr>

        <!-- Deep-link CTA -->
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="border-radius:8px;background:${brand};">
                  <a href="${p.inviteUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
                    Open in the PingForce app →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:12px 2px 0 2px;font-size:12px;line-height:18px;color:${muted};text-align:center;font-family:Arial,Helvetica,sans-serif;">
              Already installed? This opens the app with your workspace pre-filled.
            </p>
          </td>
        </tr>

        <!-- Install links -->
        <tr>
          <td style="padding:16px 32px 8px 32px;">
            <p style="margin:0 0 10px 0;font-size:13px;color:${ink};font-weight:600;font-family:Arial,Helvetica,sans-serif;">Don't have the app yet?</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;">
                  <a href="${p.androidUrl}" style="display:inline-block;padding:10px 18px;font-size:13px;font-weight:600;color:${ink};text-decoration:none;border:1px solid ${line};border-radius:8px;font-family:Arial,Helvetica,sans-serif;">▶ Google Play</a>
                </td>
                <td>
                  <a href="${p.iosUrl}" style="display:inline-block;padding:10px 18px;font-size:13px;font-weight:600;color:${ink};text-decoration:none;border:1px solid ${line};border-radius:8px;font-family:Arial,Helvetica,sans-serif;"> App Store</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Web portal -->
        <tr>
          <td style="padding:20px 32px 32px 32px;">
            <p style="margin:0;font-size:13px;line-height:20px;color:${muted};font-family:Arial,Helvetica,sans-serif;">
              Prefer a browser? Sign in to the admin web portal at
              <a href="${p.webUrl}" style="color:${brand};text-decoration:none;font-weight:600;">${p.webUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid ${line};">
            <p style="margin:0;font-size:11px;line-height:16px;color:${muted};font-family:Arial,Helvetica,sans-serif;">
              You received this email because a PingForce workspace was provisioned for this address.
              If this wasn't you, please ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
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
