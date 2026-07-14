import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths whose bodies must never be recorded (credentials in flight). */
const BODY_BLOCKLIST_PREFIXES = ['/api/v1/auth'];

/** Keys stripped from any recorded payload. */
const SENSITIVE_KEYS =
  /pass(word)?|token|secret|otp|signature|authorization|credential/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined || depth > 4) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((v) => sanitize(v, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? '[REDACTED]' : sanitize(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}…`;
  }
  return value;
}

/**
 * Global interceptor: records every mutating HTTP request into the audit
 * trail (AuditLogs.md §4). Reads are not audited here; sensitive reads (audit
 * access itself) are audited explicitly by their controllers.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    const method: string = request.method;
    if (!MUTATING_METHODS.has(method)) return next.handle();

    const path: string = request.originalUrl?.split('?')[0] ?? request.url;
    const user = request.user;
    const record = (outcome: 'SUCCESS' | 'FAILURE', statusCode?: number) => {
      // Unauthenticated mutations on public routes (login, register) still get
      // audited under the tenant once known; otherwise skip — nothing to scope to.
      const tenantId: string | undefined = user?.tenantId;
      if (!tenantId) return;

      const segments = path.replace(/^\/api\/v\d+\//, '').split('/');
      const module = (segments[0] ?? 'UNKNOWN').toUpperCase();
      const entityId =
        request.params?.id ??
        segments.find((s: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
        ) ??
        '-';

      const includeBody = !BODY_BLOCKLIST_PREFIXES.some((p) =>
        path.startsWith(p),
      );

      void this.auditService.log({
        tenantId,
        actorId: user?.userId,
        module,
        entityName: segments[0] ?? 'unknown',
        entityId,
        action: `${method} ${path}`,
        outcome,
        severity: outcome === 'FAILURE' && statusCode === 403 ? 'MEDIUM' : 'INFO',
        newValue: includeBody ? sanitize(request.body) : undefined,
        requestId: request.requestId,
        ipAddress: request.ip,
        userAgent: request.headers?.['user-agent'],
        deviceId: request.headers?.['x-device-id'],
      });
    };

    return next.handle().pipe(
      tap({
        next: () => record('SUCCESS'),
        error: (err) => record('FAILURE', err?.status),
      }),
    );
  }
}
