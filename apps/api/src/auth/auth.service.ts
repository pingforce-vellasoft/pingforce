import { Injectable, UnauthorizedException, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { LoginDto } from '@pingforce-monorepo/dto';
import { IAuthService, IPrismaService } from '@pingforce-monorepo/shared';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { RegisterEmployeeDto } from './dto/register-employee.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client();

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    if (!loginDto.tenantCode || loginDto.tenantCode.trim() === '') {
      // Super Admin Login
      const superAdmin = await this.prisma.superAdmin.findUnique({
        where: { email: loginDto.email },
      });
      if (!superAdmin) {
        throw new UnauthorizedException('Invalid super admin credentials');
      }
      const isPasswordValid = await argon2.verify(superAdmin.passwordHash, loginDto.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid super admin credentials');
      }
      if (superAdmin.status !== 'ACTIVE') {
        throw new UnauthorizedException('Super admin account is suspended');
      }
      
      const portalType = (loginDto as any).portalType;
      if (portalType === 'MOBILE_APP') {
        throw new UnauthorizedException('Super admins can only login via the admin portal');
      }

      return this.generateTokens(superAdmin.id, 'SYSTEM', superAdmin.tokenVersion, 'SUPER_ADMIN');
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
        role: true
      }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE' || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    // Role-based platform access control
    const roleCode = user.role?.code || (user.clientCode === 'SYS_ADMIN' ? 'SUPER_ADMIN' : 'UNKNOWN');
    const portalType = (loginDto as any).portalType; // using any to bypass strict type if DTO didn't rebuild yet

    if (portalType === 'ADMIN_PORTAL') {
      if (roleCode === 'EMPLOYEE_FIELD_STAFF' || roleCode === 'CUSTOMER') {
        throw new UnauthorizedException('This account is restricted to the mobile app only');
      }
    } else if (portalType === 'MOBILE_APP') {
      if (roleCode === 'SUPER_ADMIN') {
        throw new UnauthorizedException('Super admins can only login via the admin portal');
      }
    }

    return this.generateTokens(user.id, tenant.id, user.tokenVersion, roleCode);
  }

  async generateTokens(userId: string, tenantId: string, tokenVersion: number, roleCode: string) {
    const payload = { sub: userId, tenantId, tokenVersion, role: roleCode };
    const accessToken = this.jwtService.sign(payload);
    
    const tokenId = uuidv4();
    const refreshTokenPayload = { sub: userId, tenantId, tokenVersion, role: roleCode, jti: tokenId };
    // Usually refresh tokens have longer expiry
    const refreshToken = this.jwtService.sign(refreshTokenPayload, { expiresIn: '7d' });

    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + 7);

    if (tenantId !== 'SYSTEM') {
      await this.prisma.refreshToken.create({
        data: {
          userId,
          tenantId,
          tokenHash: tokenId,
          expiresAt: expiresIn,
        },
      });
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const tokenId = decoded.jti;
      const tenantId = decoded.tenantId;

      if (tenantId === 'SYSTEM') {
        const superAdmin = await this.prisma.superAdmin.findUnique({
          where: { id: decoded.sub },
        });

        if (!superAdmin || superAdmin.tokenVersion !== decoded.tokenVersion || superAdmin.status !== 'ACTIVE') {
          throw new UnauthorizedException('Token invalid or super admin suspended');
        }

        return this.generateTokens(superAdmin.id, 'SYSTEM', superAdmin.tokenVersion, 'SUPER_ADMIN');
      }

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { tokenHash: tokenId },
      });

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token is invalid or expired');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { role: true, tenant: true },
      });

      if (!user || user.tokenVersion !== decoded.tokenVersion) {
        throw new UnauthorizedException('Token version mismatch or user not found');
      }

      if (user.status !== 'ACTIVE' || user.tenant.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is inactive or suspended');
      }

      // Delete the old refresh token to implement rotation
      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      const roleCode = user.role?.code || 'UNKNOWN';
      return this.generateTokens(user.id, user.tenantId, user.tokenVersion, roleCode);

    } catch (e) {
      if (e instanceof TokenExpiredError) {
        throw new UnauthorizedException('Refresh token expired');
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  private generateTenantCode(tenantName: string): string {
    const prefix = tenantName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X');
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randomNum}`;
  }

  async googleAuth(dto: GoogleAuthDto) {
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: dto.idToken,
        // audience: 'YOUR_CLIENT_ID.apps.googleusercontent.com', // Specify the CLIENT_ID of the app that accesses the backend if needed
      });
      payload = ticket.getPayload();
    } catch (e) {
      throw new UnauthorizedException('Invalid Google Identity Token');
    }

    if (!payload || !payload.email) {
      throw new UnauthorizedException('Google token did not contain an email address');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    let user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: payload.email,
      },
      include: {
        role: true
      }
    });

    if (!user) {
      // Auto-register the user if they don't exist
      const defaultRole = await this.prisma.role.findFirst({
        where: { code: 'EMPLOYEE_FIELD_STAFF', tenantId: tenant.id }
      });
      
      if (!defaultRole) {
        throw new BadRequestException('Default role not found for tenant');
      }

      user = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          roleId: defaultRole.id,
          email: payload.email,
          phone: '',
          // Generate a random password hash since they use Google auth
          passwordHash: await argon2.hash(uuidv4()),
          status: 'ACTIVE',
        },
        include: {
          role: true
        }
      }) as any;
    }

    if (user!.status !== 'ACTIVE' || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const roleCode = user!.role?.code || 'UNKNOWN';
    return this.generateTokens(user!.id, tenant.id, user!.tokenVersion, roleCode);
  }

  async registerTenant(dto: RegisterTenantDto) {
    const existingTenant = await this.prisma.tenant.findFirst({
      where: { name: dto.tenantName }
    });
    if (existingTenant) {
      throw new BadRequestException('A tenant with this name already exists.');
    }

    let tenantCode = this.generateTenantCode(dto.tenantName);
    let isCodeUnique = false;
    while (!isCodeUnique) {
      const existingCode = await this.prisma.tenant.findUnique({ where: { code: tenantCode } });
      if (!existingCode) {
        isCodeUnique = true;
      } else {
        tenantCode = this.generateTenantCode(dto.tenantName);
      }
    }

    const passwordHash = await argon2.hash(dto.adminPassword);

    // Run in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      const tenant = await prisma.tenant.create({
        data: {
          name: dto.tenantName,
          code: tenantCode,
          domain: dto.domain,
          status: 'ACTIVE'
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

      const adminUser = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          email: dto.adminEmail,
          passwordHash: passwordHash,
          profile: {
            create: {
              firstName: dto.adminFirstName,
              lastName: dto.adminLastName
            }
          },
          phone: dto.adminPhone,
          status: 'ACTIVE',
          clientCode: 'TENANT_ADMIN'
        }
      });

      return { tenant, adminUser };
    });

    return {
      message: 'Tenant registered successfully',
      tenantCode: result.tenant.code
    };
  }

  async registerEmployee(dto: RegisterEmployeeDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode }
    });

    if (!tenant) {
      throw new BadRequestException('Invalid tenant code provided.');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new BadRequestException('This tenant account is inactive.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email: dto.email }
    });

    if (existingUser) {
      throw new BadRequestException('An employee with this email already exists in this tenant.');
    }

    const passwordHash = await argon2.hash(dto.password);

    let employeeRole = await this.prisma.role.findFirst({
      where: { tenantId: tenant.id, code: 'EMPLOYEE_FIELD_STAFF' }
    });

    if (!employeeRole) {
      employeeRole = await this.prisma.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Employee / Field Staff',
          code: 'EMPLOYEE_FIELD_STAFF',
          description: 'Standard employee (Mobile App Only)',
          isSystem: true
        }
      });
    }

    const employee = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        roleId: employeeRole.id,
        email: dto.email,
        passwordHash: passwordHash,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName
          }
        },
        phone: dto.phone,
        status: 'ACTIVE',
        clientCode: `EMP_${Date.now()}`
      }
    });

    return {
      message: 'Employee registered successfully. You can now log in.',
      userId: employee.id
    };
  }
}
