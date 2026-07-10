import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../auth/auth.service';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const authService = injector.get(AuthService);
      
      if (error.status === 401 && !req.url.includes('/api/v1/auth/login') && !req.url.includes('/api/v1/auth/refresh')) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((token: any) => {
              isRefreshing = false;
              if (token) {
                refreshTokenSubject.next(token);
                
                const newReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${authService.getToken()}`,
                  },
                });
                return next(newReq);
              }
              return throwError(() => error);
            }),
            catchError((err) => {
              isRefreshing = false;
              return throwError(() => err);
            })
          );
        } else {
          return refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(jwt => {
              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${authService.getToken()}`,
                },
              });
              return next(newReq);
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};
