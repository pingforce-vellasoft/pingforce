import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<{
      module: string;
      action: string;
    }>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Customer portal identities can never pass a staff-guarded route, even
    // one without an explicit permission (3.8_CustomerPortal BR-9.1) — they
    // use PortalUserGuard-protected routes instead.
    if (user?.userType === 'CUSTOMER') {
      throw new ForbiddenException(
        'Customer portal accounts cannot access staff functionality',
      );
    }

    if (!requiredPermission) {
      return true; // No permission required for this route
    }

    if (!user || !user.userId) {
      throw new ForbiddenException(
        'User context missing. Ensure JwtAuthGuard runs before RbacGuard.',
      );
    }

    // A temporary password (admin-created user, self-signup admin, reset)
    // must be replaced before the account can do anything. The apps enforce
    // this as a gate, but the API is the security boundary: until now a
    // temporary password worked on every business route indefinitely. Auth
    // routes (me, change-password, logout) are not RBAC-guarded, so the
    // change itself still works.
    if (user.mustChangePassword === true) {
      throw new ForbiddenException({
        errorCode: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Change your temporary password before continuing.',
      });
    }

    if (user.tenantId === 'SYSTEM') {
      return true;
    }

    const hasPermission = await this.rbacService.hasPermission(
      user.userId, // use userId from Jwt payload mapping
      requiredPermission.module,
      requiredPermission.action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermission.action} on ${requiredPermission.module}`,
      );
    }

    return true;
  }
}
