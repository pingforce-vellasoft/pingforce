import { HttpInterceptorFn } from '@angular/common/http';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Read token directly from localStorage to avoid circular dependency with AuthService
  const token = localStorage.getItem('pingforce_admin_token');
  const impersonatedTenant = localStorage.getItem(
    'pingforce_impersonated_tenant',
  );

  if (token) {
    let headers = req.headers.set('Authorization', `Bearer ${token}`);

    if (impersonatedTenant) {
      headers = headers.set('X-Tenant-Id', impersonatedTenant);
    }

    req = req.clone({ headers });
  }

  return next(req);
};
