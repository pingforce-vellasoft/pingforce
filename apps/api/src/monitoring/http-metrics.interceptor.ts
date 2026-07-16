import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export const HTTP_REQUEST_DURATION = 'http_request_duration_seconds';

/**
 * Per-request duration histogram labeled by method/route/status.
 * Uses the route pattern (":id"), never the raw URL, to keep label
 * cardinality bounded.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION)
    private readonly duration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const method: string = req.method ?? 'UNKNOWN';
    const route: string = req.route?.path ?? req.path ?? 'unknown';
    const end = this.duration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          end({ status: String(res.statusCode ?? 200) });
        },
        error: (err) => {
          end({ status: String(err?.status ?? 500) });
        },
      }),
    );
  }
}
