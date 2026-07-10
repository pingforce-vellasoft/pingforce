import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { map } from 'rxjs';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredRoles = route.data['roles'] as string[];

  // If no specific roles required, allow access
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const checkRole = () => {
    return authService.hasRole(requiredRoles)
      ? true
      : router.parseUrl('/dashboard');
  };

  // If already loaded
  if (authService.currentUser()) {
    return checkRole();
  }

  // Wait for profile to load (using the shared fetchProfile observable)
  return authService.fetchProfile().pipe(
    map((profile) => {
      if (!profile) return router.parseUrl('/login');
      return checkRole();
    }),
  );
};
