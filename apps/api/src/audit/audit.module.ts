import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditRetentionService } from './audit-retention.service';

// Global: AuditService is injected by auth (OTP/session events) and the
// mutation interceptor runs application-wide.
@Global()
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditRetentionService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
