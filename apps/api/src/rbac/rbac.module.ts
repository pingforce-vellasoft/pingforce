import { Global, Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacController } from './rbac.controller';
import { RbacGuard } from './guards/rbac.guard';

// Global: RbacGuard is applied on every business controller, so RbacService
// must be resolvable from every feature module.
@Global()
@Module({
  imports: [],
  controllers: [RbacController],
  providers: [RbacService, RbacGuard],
  exports: [RbacService, RbacGuard],
})
export class RbacModule {}
