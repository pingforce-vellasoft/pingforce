import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtConfigService } from './jwt-config.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwtConfig = new JwtConfigService();
        const { key, algorithm } = jwtConfig.getPrivateKey();
        return {
          privateKey: key,
          signOptions: {
            algorithm,
            expiresIn: config.get<string>('JWT_EXPIRATION', '15m') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: 'IAuthService', useExisting: AuthService },
    JwtStrategy,
    JwtConfigService,
  ],
  exports: [
    AuthService,
    'IAuthService',
    JwtStrategy,
    PassportModule,
    JwtConfigService,
  ],
})
export class AuthModule {}
