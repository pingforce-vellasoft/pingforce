import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtConfigService } from './jwt-config.service';
import { OtpService } from './otp.service';
import { PasswordResetService } from './password-reset.service';
import { SessionService } from './session.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
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
            // Mandatory claims (JWT.md §4)
            issuer: config.get<string>('JWT_ISSUER', 'pingforce'),
            audience: config.get<string>('JWT_AUDIENCE', 'pingforce-api'),
            notBefore: 0,
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
    OtpService,
    PasswordResetService,
    SessionService,
  ],
  exports: [
    AuthService,
    'IAuthService',
    JwtStrategy,
    PassportModule,
    JwtConfigService,
    SessionService,
  ],
})
export class AuthModule {}
