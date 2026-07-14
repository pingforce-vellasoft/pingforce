/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-non-null-assertion */
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import { LoginDto } from '@pingforce-monorepo/dto';
import { IAuthService, IPrismaService } from '@pingforce-monorepo/shared';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { RegisterEmployeeDto } from './dto/register-employee.dto';
import { OnboardingTenantDto } from './dto/onboarding-tenant.dto';
import { OnboardingEmployeeDto } from './dto/onboarding-employee.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { OAuth2Client } from 'google-auth-library';
import { syncSystemRolePermissions } from '../rbac/permission-catalog';
import { SessionService, SessionMeta } from './session.service';
import { AuditService } from '../audit/audit.service';

const googleClient = new OAuth2Client();

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
  ) {}

  async login(loginDto: LoginDto, meta: SessionMeta = {}) {
    if (!loginDto.tenantCode || loginDto.tenantCode.trim() === '') {
      // Super Admin Login
      const superAdmin = await this.prisma.superAdmin.findUnique({
        where: { email: loginDto.email },
      });
      if (!superAdmin) {
        throw new UnauthorizedException('Invalid super admin credentials');
      }
      const isPasswordValid = await argon2.verify(
        superAdmin.passwordHash,
        loginDto.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid super admin credentials');
      }
      if (superAdmin.status !== 'ACTIVE') {
        throw new UnauthorizedException('Super admin account is suspended');
      }

      const portalType = (loginDto as any).portalType;
      if (portalType === 'MOBILE_APP') {
        throw new UnauthorizedException(
          'Super admins can only login via the admin portal',
        );
      }

      return this.generateTokens(
        superAdmin.id,
        'SYSTEM',
        superAdmin.tokenVersion,
        'SUPER_ADMIN',
      );
    }

    // Tenant User Login
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: loginDto.tenantCode },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        ...(loginDto.email ? { email: loginDto.email } : {}),
        ...(loginDto.phone ? { phone: loginDto.phone } : {}),
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      void this.auditService.log({
        tenantId: tenant.id,
        module: 'AUTH',
        entityName: 'user',
        entityId: loginDto.email ?? loginDto.phone ?? '-',
        action: 'LOGIN_FAILED',
        outcome: 'FAILURE',
        severity: 'MEDIUM',
        newValue: { reason: 'UNKNOWN_ACCOUNT' },
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      loginDto.password,
    );
    if (!isPasswordValid) {
      void this.auditService.log({
        tenantId: tenant.id,
        actorId: user.id,
        module: 'AUTH',
        entityName: 'user',
        entityId: user.id,
        action: 'LOGIN_FAILED',
        outcome: 'FAILURE',
        severity: 'MEDIUM',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE' || tenant.status !== 'ACTIVE') {
      void this.auditService.log({
        tenantId: tenant.id,
        actorId: user.id,
        module: 'AUTH',
        entityName: 'user',
        entityId: user.id,
        action: 'LOGIN_FAILED',
        outcome: 'FAILURE',
        severity: 'MEDIUM',
        newValue: { reason: 'ACCOUNT_INACTIVE' },
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    // Role-based platform access control
    const roleCode =
      user.role?.code ||
      (user.clientCode === 'SYS_ADMIN' ? 'SUPER_ADMIN' : 'UNKNOWN');
    const portalType = (loginDto as any).portalType; // using any to bypass strict type if DTO didn't rebuild yet

    if (portalType === 'ADMIN_PORTAL') {
      if (roleCode === 'EMPLOYEE_FIELD_STAFF' || roleCode === 'CUSTOMER') {
        throw new UnauthorizedException(
          'This account is restricted to the mobile app only',
        );
      }
    } else if (portalType === 'MOBILE_APP') {
      if (roleCode === 'SUPER_ADMIN') {
        throw new UnauthorizedException(
          'Super admins can only login via the admin portal',
        );
      }
    }

    // Persistent session — refresh tokens are bound to it (SessionManagement.md)
    const sessionId = await this.sessionService.create(tenant.id, user.id, {
      ...meta,
      platform:
        meta.platform ?? (portalType === 'MOBILE_APP' ? 'MOBILE' : 'WEB'),
    });

    void this.auditService.log({
      tenantId: tenant.id,
      actorId: user.id,
      module: 'AUTH',
      entityName: 'user',
      entityId: user.id,
      action: 'LOGIN',
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return this.generateTokens(
      user.id,
      tenant.id,
      user.tokenVersion,
      roleCode,
      sessionId,
    );
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async generateTokens(
    userId: string,
    tenantId: string,
    tokenVersion: number,
    roleCode: string,
    sessionId?: string,
  ) {
    const payload = {
      sub: userId,
      tenantId,
      tokenVersion,
      role: roleCode,
      sid: sessionId,
    };
    const accessToken = this.jwtService.sign(payload);

    // Opaque refresh token (RefreshToken.md §3): cryptographically random,
    // never a JWT, stored only as a SHA-256 hash. Super-admin tokens are
    // persisted too, so SYSTEM sessions are revocable.
    const refreshToken = randomBytes(48).toString('base64url');

    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        ...(tenantId === 'SYSTEM'
          ? { superAdminId: userId }
          : { userId, sessionId }),
        tenantId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: expiresIn,
      },
    });

    let userDetails = null;
    if (tenantId === 'SYSTEM') {
      const admin = await this.prisma.superAdmin.findUnique({
        where: { id: userId },
      });
      if (admin) {
        userDetails = {
          id: admin.id,
          email: admin.email,
          name: admin.name || 'Super Admin',
          role: 'SUPER_ADMIN',
          tenantId: 'SYSTEM',
          tenantCode: 'SYSTEM',
          isOnboarded: true,
        };
      }
    } else {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true, role: true, profile: true },
      });
      if (u) {
        userDetails = {
          id: u.id,
          email: u.email,
          name: u.profile?.firstName
            ? `${u.profile.firstName} ${u.profile.lastName}`
            : 'User',
          role: u.role?.code || 'UNKNOWN',
          tenantId: u.tenantId,
          tenantCode: u.tenant.code,
          isOnboarded: !!u.profile,
        };
      }
    }

    return {
      accessToken,
      access_token: accessToken, // for compatibility
      refreshToken,
      refresh_token: refreshToken, // for compatibility
      user: userDetails,
    };
  }

  async refreshToken(token: string) {
    // Opaque token lookup — no JWT parsing (RefreshToken.md §3)
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashRefreshToken(token) },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Replay detection (RefreshToken.md §8): a rotated/revoked token being
    // presented again means it was stolen or replayed. Kill every session.
    if (storedToken.revokedAt) {
      if (storedToken.userId) {
        await this.prisma.user.update({
          where: { id: storedToken.userId },
          data: { tokenVersion: { increment: 1 } },
        });
        await this.sessionService.revokeAllForUser(
          storedToken.tenantId,
          storedToken.userId,
          'TOKEN_REPLAY',
        );
      } else if (storedToken.superAdminId) {
        await this.prisma.superAdmin.update({
          where: { id: storedToken.superAdminId },
          data: { tokenVersion: { increment: 1 } },
        });
        await this.prisma.refreshToken.updateMany({
          where: { superAdminId: storedToken.superAdminId, revokedAt: null },
          data: { revokedAt: new Date(), revokeReason: 'TOKEN_REPLAY' },
        });
      }
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Rotation: mark the old token revoked (kept for replay detection)
    const rotate = () =>
      this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: new Date(),
          revokeReason: 'ROTATED',
          lastUsedAt: new Date(),
        },
      });

    // Super admin (SYSTEM) path
    if (storedToken.superAdminId) {
      const superAdmin = await this.prisma.superAdmin.findUnique({
        where: { id: storedToken.superAdminId },
      });
      if (!superAdmin || superAdmin.status !== 'ACTIVE') {
        throw new UnauthorizedException(
          'Token invalid or super admin suspended',
        );
      }

      await rotate();
      return this.generateTokens(
        superAdmin.id,
        'SYSTEM',
        superAdmin.tokenVersion,
        'SUPER_ADMIN',
      );
    }

    // Tenant user path
    if (
      storedToken.sessionId &&
      !(await this.sessionService.isActive(storedToken.sessionId))
    ) {
      throw new UnauthorizedException('Session has been revoked or expired');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId ?? '' },
      include: { role: true, tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE' || user.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    await rotate();

    if (storedToken.sessionId) {
      await this.sessionService.touch(storedToken.sessionId);
    }

    const roleCode = user.role?.code || 'UNKNOWN';
    return this.generateTokens(
      user.id,
      user.tenantId,
      user.tokenVersion,
      roleCode,
      storedToken.sessionId ?? undefined,
    );
  }

  /** Logout-all: invalidates every access token (tokenVersion) and revokes all sessions/refresh tokens. */
  async logoutAll(tenantId: string, userId: string): Promise<void> {
    if (tenantId === 'SYSTEM') {
      await this.prisma.superAdmin.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });
      await this.prisma.refreshToken.updateMany({
        where: { superAdminId: userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'LOGOUT_ALL' },
      });
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await this.sessionService.revokeAllForUser(tenantId, userId, 'LOGOUT_ALL');
  }

  private generateTenantCode(tenantName: string): string {
    const prefix = tenantName
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase()
      .padEnd(3, 'X');
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randomNum}`;
  }

  async googleAuth(dto: GoogleAuthDto) {
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: process.env.GOOGLE_CLIENT_ID as string,
      });
      payload = ticket.getPayload();
    } catch (e) {
      throw new UnauthorizedException('Invalid Google Identity Token');
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException(
        'Google token did not contain an email address',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: payload.email,
      },
      include: {
        role: true,
      },
    });

    if (!user) {
      // Google sign-in is authentication only — it must never provision
      // accounts. A tenant code is guessable, so auto-registration would let
      // anyone with a Google account join any tenant. Users must be invited
      // or registered by their tenant admin first.
      throw new UnauthorizedException(
        'No account exists for this email in the selected workspace. Contact your administrator for an invitation.',
      );
    }

    if (user!.status !== 'ACTIVE' || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const roleCode = user!.role?.code || 'UNKNOWN';
    return this.generateTokens(
      user!.id,
      tenant.id,
      user!.tokenVersion,
      roleCode,
    );
  }

  async registerTenant(dto: RegisterTenantDto) {
    const fallbackTenantName = dto.tenantName || 'My Workspace';

    if (dto.tenantName) {
      const existingTenant = await this.prisma.tenant.findFirst({
        where: { name: dto.tenantName },
      });
      if (existingTenant) {
        throw new BadRequestException(
          'A tenant with this name already exists.',
        );
      }
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new BadRequestException(
        'An account with this email already exists.',
      );
    }

    let tenantCode = this.generateTenantCode(fallbackTenantName);
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existingCode = await this.prisma.tenant.findUnique({
        where: { code: tenantCode },
      });
      if (!existingCode) {
        isCodeUnique = true;
      } else {
        tenantCode = this.generateTenantCode(fallbackTenantName);
      }
    }

    const passwordHash = await argon2.hash(dto.adminPassword);

    // Run in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      const tenant = await prisma.tenant.create({
        data: {
          name: fallbackTenantName,
          code: tenantCode,
          domain: dto.domain,
          status: 'ACTIVE',
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

      await syncSystemRolePermissions(prisma, adminRole.id, 'ADMIN_MANAGER');

      const profileData =
        dto.adminFirstName && dto.adminLastName
          ? {
              create: {
                firstName: dto.adminFirstName,
                lastName: dto.adminLastName,
              },
            }
          : undefined;

      const adminUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          email: dto.adminEmail,
          passwordHash: passwordHash,
          profile: profileData,
          phone: dto.adminPhone,
          status: 'ACTIVE',
          clientCode: 'TENANT_ADMIN',
        },
      });

      return { tenant, adminUser };
    });

    const tokens = await this.generateTokens(
      result.adminUser.id,
      result.tenant.id,
      result.adminUser.tokenVersion,
      'ADMIN_MANAGER',
    );

    return {
      message: 'Tenant registered successfully',
      tenantCode: result.tenant.code,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        role: 'ADMIN_MANAGER',
        tenantId: result.tenant.id,
      },
    };
  }

  async registerEmployee(dto: RegisterEmployeeDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid tenant code provided.');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new BadRequestException('This tenant account is inactive.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException(
        'An employee with this email already exists in this tenant.',
      );
    }

    const passwordHash = await argon2.hash(dto.password);

    let employeeRole = await this.prisma.role.findFirst({
      where: { tenantId: tenant.id, code: 'EMPLOYEE_FIELD_STAFF' },
    });

    if (!employeeRole) {
      employeeRole = await this.prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Employee / Field Staff',
          code: 'EMPLOYEE_FIELD_STAFF',
          description: 'Standard employee (Mobile App Only)',
          isSystem: true,
        },
      });
    }

    await syncSystemRolePermissions(
      this.prisma,
      employeeRole.id,
      'EMPLOYEE_FIELD_STAFF',
    );

    const employee = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        roleId: employeeRole.id,
        email: dto.email,
        passwordHash: passwordHash,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
        phone: dto.phone,
        status: 'ACTIVE',
        clientCode: `EMP_${Date.now()}`,
      },
    });

    return {
      message: 'Employee registered successfully. You can now log in.',
      userId: employee.id,
    };
  }

  async onboardTenant(
    userId: string,
    tenantId: string,
    dto: OnboardingTenantDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: { profile: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.profile)
      throw new BadRequestException('User is already onboarded');

    let logoUrl = null;
    if (dto.logoBase64) {
      try {
        const fs = require('fs');
        const path = require('path');
        const crypto = require('crypto');

        const uploadsDir = path.join(process.cwd(), 'uploads', 'logos');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const base64Data = dto.logoBase64.replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        const filename = `${tenantId}-${crypto.randomBytes(4).toString('hex')}.png`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, base64Data, 'base64');
        logoUrl = `/api/v1/uploads/logos/${filename}`;
      } catch (err) {
        console.error('Failed to save logo:', err);
      }
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name: dto.tenantName,
          industry: dto.industry,
          legalName: dto.legalName,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          country: dto.country,
          postalCode: dto.postalCode,
          billingEmail: dto.billingEmail,
          themeColor: dto.themeColor,
          ...(logoUrl && { logoUrl }),
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          phone: dto.phone,
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
            },
          },
        },
      });
    });

    return { message: 'Tenant onboarding completed successfully' };
  }

  async onboardEmployee(
    userId: string,
    tenantId: string,
    dto: OnboardingEmployeeDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, tenantId },
      include: { profile: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.profile)
      throw new BadRequestException('User is already onboarded');

    // Here we can validate if the dto.tenantCode matches the invite code or the tenant they belong to.
    // If they were created in a temporary tenant (e.g. from generic signup), we would move them to the target tenant here.
    // For now, assuming they signed up via invite link and just need to fill profile.

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: dto.phone,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
    });

    return { message: 'Employee onboarding completed successfully' };
  }
}
