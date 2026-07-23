import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Algorithm } from 'jsonwebtoken';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtConfigService } from '../jwt-config.service';
import { IPrismaService } from '@pingforce-monorepo/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @Inject('IPrismaService') private readonly prisma: IPrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly jwtConfig: JwtConfigService,
  ) {
    const { key, algorithm } = jwtConfig.getPublicKey();

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: key,
      algorithms: [algorithm as Algorithm],
      // Validate mandatory claims (JWT.md §4)
      issuer: configService.get<string>('JWT_ISSUER', 'pingforce'),
      audience: configService.get<string>('JWT_AUDIENCE', 'pingforce-api'),
    });
  }

  async validate(payload: any) {
    const cacheKey = `user_validate_${payload.sub}`;

    // Customer Portal identity (3.8_CustomerPortal) — separate identity type;
    // returns userType: 'CUSTOMER' so staff guards can reject portal tokens.
    if (payload.userType === 'CUSTOMER') {
      const portalCacheKey = `portal_user_validate_${payload.sub}`;
      let portalUser = await this.cacheManager.get<any>(portalCacheKey);
      if (!portalUser) {
        portalUser = await this.prisma.customerPortalUser.findUnique({
          where: { id: payload.sub },
          include: { tenant: true },
        });
        if (portalUser) {
          await this.cacheManager.set(portalCacheKey, portalUser, 5000);
        }
      }

      if (
        !portalUser ||
        portalUser.status !== 'ACTIVE' ||
        portalUser.deletedAt ||
        portalUser.tenant.status !== 'ACTIVE'
      ) {
        throw new UnauthorizedException();
      }
      if (portalUser.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Token revoked');
      }

      return {
        userId: payload.sub,
        tenantId: portalUser.tenantId,
        customerId: portalUser.customerId,
        email: portalUser.email,
        userType: 'CUSTOMER',
        portalRole: portalUser.portalRole,
        roleCode: 'PORTAL_CUSTOMER', // never matches any staff role
      };
    }

    if (payload.tenantId === 'SYSTEM') {
      let superAdmin = await this.cacheManager.get<any>(cacheKey);
      if (!superAdmin) {
        superAdmin = await this.prisma.superAdmin.findUnique({
          where: { id: payload.sub },
        });
        if (superAdmin) {
          await this.cacheManager.set(cacheKey, superAdmin, 5000);
        }
      }

      if (!superAdmin || superAdmin.status !== 'ACTIVE') {
        throw new UnauthorizedException();
      }
      if (superAdmin.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Token revoked');
      }

      return {
        userId: payload.sub,
        tenantId: 'SYSTEM',
        email: superAdmin.email,
        roleCode: 'SUPER_ADMIN',
        // Onboarding collects a tenant profile, which a platform super admin
        // never has. Report it complete so the admin portal does not trap the
        // account on /onboarding.
        isOnboarded: true,
        sessionId: payload.sid,
      };
    }

    let user = await this.cacheManager.get<any>(cacheKey);

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { tenant: true, role: true, profile: true },
      });
      if (user) {
        await this.cacheManager.set(cacheKey, user, 5000); // 5 sec TTL for faster revocation
      }
    }

    if (!user || user.status !== 'ACTIVE' || user.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token revoked');
    }

    const roleCode =
      user.role?.code ||
      (user.clientCode === 'SYS_ADMIN' ? 'SUPER_ADMIN' : 'UNKNOWN');

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      // Human-facing workspace identifier (tenant code) shown on dashboards.
      workspaceId: user.tenant.code,
      workspaceName: user.tenant.name,
      email: user.email,
      roleCode: roleCode,
      // A SYS_ADMIN-backed super admin has no tenant profile to fill in, so
      // onboarding does not apply to it either.
      isOnboarded: roleCode === 'SUPER_ADMIN' || !!user.profile,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      avatar: user.profile?.avatar ?? null,
      mustChangePassword: user.mustChangePassword,
      isAttendanceEnabled: user.tenant.isAttendanceEnabled,
      sessionId: payload.sid,
    };
  }
}
