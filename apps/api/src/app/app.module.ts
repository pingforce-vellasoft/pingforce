import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bull';
import { redisStore } from 'cache-manager-redis-yet';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { HealthController } from '../health/health.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RequestIdMiddleware } from '../common/middlewares/request-id.middleware';

import { MasterDataModule } from '../master-data/master-data.module';
import { EmployeeModule } from '../employee/employee.module';
import { CustomerModule } from '../customer/customer.module';
import { LeadModule } from '../lead/lead.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { LeaveModule } from '../leave/leave.module';
import { ShiftModule } from '../shift/shift.module';
import { PayrollModule } from '../payroll/payroll.module';
import { ClaimsModule } from '../claims/claims.module';
import { FaultsModule } from '../faults/faults.module';
import { RbacModule } from '../rbac/rbac.module';
import { SettingsModule } from '../settings/settings.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { TenantsModule } from '../tenants/tenants.module';
import { AuditModule } from '../audit/audit.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { VisitsModule } from '../visits/visits.module';
import { ReportsModule } from '../reports/reports.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { NetworkModule } from '../network/network.module';
import { PortalModule } from '../portal/portal.module';
import { BillingModule } from '../billing/billing.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // NOTE: uploads are deliberately NOT served via ServeStaticModule —
    // static serving bypasses Nest guards and exposed /api/v1/uploads to
    // anyone with the URL. Files are streamed through the guarded
    // FilesController instead (security audit B4).
    EventEmitterModule.forRoot(),
    TerminusModule,
    // Tiered limits (SCALABILITY_AUDIT): the old single 100/min-per-IP limit
    // false-blocked offices behind NAT during the morning punch rush. Burst
    // absorbs spikes, sustained caps abuse; auth endpoints carry stricter
    // per-route @Throttle overrides.
    ThrottlerModule.forRoot([
      { name: 'burst', ttl: 10_000, limit: 60 },
      { name: 'sustained', ttl: 60_000, limit: 600 },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req: any) => req.requestId || req.headers['x-request-id'],
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        }),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),
    PrismaModule,
    AuthModule,
    MasterDataModule,
    EmployeeModule,
    CustomerModule,
    LeadModule,
    AttendanceModule,
    LeaveModule,
    ShiftModule,
    PayrollModule,
    ClaimsModule,
    FaultsModule,
    RbacModule,
    SettingsModule,
    FilesModule,
    NotificationsModule,
    PlatformSettingsModule,
    TenantsModule,
    AuditModule,
    ApprovalsModule,
    VisitsModule,
    ReportsModule,
    SchedulerModule,
    MonitoringModule,
    NetworkModule,
    BillingModule,
    PortalModule,
    DashboardModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
