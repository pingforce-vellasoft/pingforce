import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  PrometheusModule,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BullModule } from '@nestjs/bull';
import {
  HttpMetricsInterceptor,
  HTTP_REQUEST_DURATION,
} from './http-metrics.interceptor';

/**
 * Observability (Master Plan Phase 3):
 * - Prometheus metrics at GET /api/v1/metrics (default Node metrics +
 *   HTTP duration histogram) — scraped by the prometheus container
 * - Bull Board queue dashboard at /queues — protect at the reverse proxy
 *   or via BULL_BOARD_USER/BULL_BOARD_PASS basic auth in main.ts
 */
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullModule.registerQueue(
      { name: 'notifications-email' },
      { name: 'notifications-whatsapp' },
      { name: 'notifications-push' },
      { name: 'sla-monitor' },
      { name: 'payroll' },
    ),
    BullBoardModule.forFeature(
      { name: 'notifications-email', adapter: BullAdapter },
      { name: 'notifications-whatsapp', adapter: BullAdapter },
      { name: 'notifications-push', adapter: BullAdapter },
      { name: 'sla-monitor', adapter: BullAdapter },
      { name: 'payroll', adapter: BullAdapter },
    ),
  ],
  providers: [
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class MonitoringModule {}
