import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';
import { IPrismaService } from '@pingforce-monorepo/shared';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    @Inject('IPrismaService') private prisma: IPrismaService,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma as any),
      // Optional: check if memory exceeds 150MB
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}
