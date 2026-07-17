import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * Prefixes relative /api requests with the environment's API origin. Services
 * keep writing '/api/v1/...'; the dev proxy handles it locally and this
 * rewrites to the absolute OCI API URL in production builds.
 */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.apiUrl && req.url.startsWith('/api')) {
    req = req.clone({ url: `${environment.apiUrl}${req.url}` });
  }
  return next(req);
};
