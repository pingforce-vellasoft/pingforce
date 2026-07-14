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
      email: user.email,
      roleCode: roleCode,
      isOnboarded: !!user.profile,
      sessionId: payload.sid,
    };
  }
}
