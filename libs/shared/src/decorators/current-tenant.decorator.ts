import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user || !request.user.tenantId) {
      throw new UnauthorizedException('Tenant context not found in token');
    }

    if (request.user.tenantId === 'SYSTEM') {
      const impersonatedTenantId = request.headers['x-tenant-id'];
      if (impersonatedTenantId) {
        return impersonatedTenantId as string;
      }
    }

    return request.user.tenantId;
  },
);
