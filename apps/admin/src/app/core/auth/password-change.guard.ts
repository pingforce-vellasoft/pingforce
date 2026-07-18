import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Blocks the app shell while an account still owes a forced password change
 * (admin-provisioned temporary password). Resolves the profile first so a
 * direct navigation with a still-valid token is caught too, then bounces to
 * /change-password.
 */
export const passwordChangeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const current = authService.currentUser();
  if (current) {
    return current.mustChangePassword
      ? router.parseUrl('/change-password')
      : true;
  }

  // Profile not loaded yet (e.g. hard refresh) — fetch, then decide.
  return authService.fetchProfile().pipe(
    map((profile) =>
      profile?.mustChangePassword ? router.parseUrl('/change-password') : true,
    ),
  );
};
