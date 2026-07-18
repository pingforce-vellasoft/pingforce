import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeRepository, IPrismaService } from '@pingforce-monorepo/shared';
import { PaginationDto } from '@pingforce-monorepo/dto';
import { RbacService } from '../rbac/rbac.service';
import { syncSystemRolePermissions } from '../rbac/permission-catalog';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Generates a human-readable temporary password: 4 random bytes rendered as a
 * base32-ish uppercase token plus digits, e.g. "PF-7K3QD9M2". Shown to the
 * admin once at creation and re-generated on invite; never stored in plaintext.
 */
function generateTempPassword(): string {
  const raw = randomBytes(6).toString('base64url').replace(/[-_]/g, '');
  return `PF-${raw.slice(0, 8).toUpperCase()}`;
}

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly rbacService: RbacService,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(tenantId: string, createEmployeeDto: CreateEmployeeDto) {
    const { roleId, ...employeeData } = createEmployeeDto;

    const basePayload = {
      ...employeeData,
      joiningDate: employeeData.joiningDate
        ? new Date(employeeData.joiningDate)
        : undefined,
    };

    // No role requested → plain employee record (no login account).
    if (!roleId) {
      return await this.employeeRepository.create(tenantId, basePayload);
    }

    // Role requested → provision a login User + Employee atomically.
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });
    if (!role) {
      throw new BadRequestException('Selected role not found for this tenant');
    }

    if (!employeeData.primaryEmail) {
      throw new BadRequestException(
        'A primary email is required to provision a login account for the employee',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { email: employeeData.primaryEmail },
          { clientCode: employeeData.employeeCode },
        ],
      },
    });
    if (existingUser) {
      throw new BadRequestException(
        'A user with this email or employee code already exists in this tenant',
      );
    }

    // Keep system-role permissions in sync (mirrors auth registration path).
    if (role.isSystem && role.code) {
      await syncSystemRolePermissions(this.prisma, role.id, role.code);
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword);

    const employee = await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          roleId: role.id,
          email: employeeData.primaryEmail,
          phone: employeeData.primaryMobile ?? undefined,
          passwordHash,
          status: 'ACTIVE',
          clientCode: employeeData.employeeCode,
          profile: {
            create: {
              firstName: employeeData.firstName,
              lastName: employeeData.lastName,
            },
          },
        },
      });

      return await tx.employee.create({
        data: {
          ...basePayload,
          tenantId,
          userId: user.id,
        },
      });
    });

    // tempPassword surfaced once to the admin UI; never persisted or re-shown.
    return { ...employee, tempPassword };
  }

  /**
   * Re-issues a temporary password for the employee's login account and emails
   * the workspace (tenant) code + credentials + admin login URL. Only works for
   * employees that have a provisioned User account.
   */
  async invite(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { user: true },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    if (!employee.userId || !employee.user) {
      throw new BadRequestException(
        'This employee has no login account. Assign a role first.',
      );
    }
    if (!employee.user.email) {
      throw new BadRequestException(
        'This employee has no email address to send the invite to',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { code: true, name: true },
    });

    const tempPassword = generateTempPassword();
    const passwordHash = await argon2.hash(tempPassword);

    // Rotate tokenVersion so any prior sessions are invalidated on reset.
    await this.prisma.user.update({
      where: { id: employee.userId },
      data: { passwordHash, tokenVersion: { increment: 1 }, status: 'ACTIVE' },
    });

    await this.deliverInvite(
      tenantId,
      employee.user.email,
      employee.firstName,
      tenant?.code ?? '',
      tenant?.name ?? 'PingForce',
      tempPassword,
    );

    return {
      message: 'Invite sent',
      email: employee.user.email,
      workspaceId: tenant?.code ?? '',
    };
  }

  private async deliverInvite(
    tenantId: string,
    email: string,
    firstName: string,
    workspaceCode: string,
    workspaceName: string,
    tempPassword: string,
  ): Promise<void> {
    const baseUrl = process.env.ADMIN_WEB_URL ?? 'https://admin.pingforce.in';
    await this.notifications.sendRawEmail(
      email,
      `You have been invited to ${workspaceName} on PingForce`,
      `<p>Hello ${firstName},</p>
       <p>An account has been created for you on the PingForce workspace
       <strong>${workspaceName}</strong>.</p>
       <p>Use the following credentials to sign in:</p>
       <ul>
         <li><strong>Workspace ID:</strong> ${workspaceCode}</li>
         <li><strong>Email:</strong> ${email}</li>
         <li><strong>Temporary password:</strong> ${tempPassword}</li>
       </ul>
       <p>Sign in here: <a href="${baseUrl}">${baseUrl}</a></p>
       <p>You will be asked to change your password after first sign-in.</p>`,
      tenantId,
    );
  }

  async findAll(
    tenantId: string,
    requesterUserId: string,
    pagination: PaginationDto = {},
  ) {
    // Data scope (DataScope.md §9 "Users"): employees see self, managers
    // their team, tenant admins the whole tenant.
    const scope = await this.rbacService.resolveScopeIds(
      tenantId,
      requesterUserId,
      'EMPLOYEES',
      ['READ'],
    );
    const scopeWhere = this.rbacService.employeeScopeWhere(scope, 'id');
    if (scopeWhere === null) return [];

    // Default fallback standardize via DTO, but we enforce limit here just in case
    const limit = Math.min(pagination.take || 50, 100);
    return await this.employeeRepository.findAllWithRelations(
      tenantId,
      limit,
      pagination.cursor,
      scopeWhere,
    );
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.employeeRepository.findOneWithRelations(
      tenantId,
      id,
    );

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async update(
    tenantId: string,
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ) {
    // roleId is create-only (provisions a login account); never an Employee column.
    const { roleId: _roleId, ...updatable } = updateEmployeeDto;
    const payload = {
      ...updatable,
      joiningDate: updatable.joiningDate
        ? new Date(updatable.joiningDate)
        : undefined,
    };

    return await this.employeeRepository.update(tenantId, id, payload);
  }

  async remove(tenantId: string, id: string) {
    return await this.employeeRepository.delete(tenantId, id);
  }
}
