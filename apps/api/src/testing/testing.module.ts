import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
// AuthModule supplies SessionService: a rewind must cut the account's live
// sessions and refresh tokens, or the handset keeps using a token minted
// before the reset.
import { AuthModule } from '../auth/auth.module';
import { TestingController } from './testing.controller';
import { TestingService } from './testing.service';

/**
 * Non-production test support for the mobile gate chain.
 *
 * AppModule imports this conditionally — `TestingService.isEnabled()` must hold
 * (NODE_ENV development|test AND ALLOW_TEST_RESET_ENDPOINT=true), so in
 * production the controller is never registered and the routes do not exist.
 * TestingService re-checks at call time as a backstop.
 */
@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [TestingController],
  providers: [TestingService],
})
export class TestingModule {}
