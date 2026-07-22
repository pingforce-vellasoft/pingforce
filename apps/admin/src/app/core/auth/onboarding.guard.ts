import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Blocks the app shell until the signed-in account has completed first-login
 * setup (profile + company, plus optional white-label branding). Bounces to
 * /onboarding. Chained after passwordChangeGuard so a temporary password is
 * always rotated first.
 */
export const onboardingGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const current = authService.currentUser();
  if (current) {
    return current.isOnboarded ? true : router.parseUrl('/onboarding');
  }

  // Profile not loaded yet (e.g. hard refresh) — fetch, then decide. A failed
  // fetch resolves to null; treat that as "not onboarded" rather than letting
  // an unknown account through.
  return authService
    .fetchProfile()
    .pipe(
      map((profile) =>
        profile?.isOnboarded ? true : router.parseUrl('/onboarding'),
      ),
    );
};

/**
 * The inverse of {@link onboardingGuard}, for the /onboarding route itself.
 * An account that already has a profile would only get a 400 ("already
 * onboarded") from the API, so send it to the dashboard instead.
 */
export const notOnboardedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const current = authService.currentUser();
  if (current) {
    return current.isOnboarded ? router.parseUrl('/dashboard') : true;
  }

  return authService
    .fetchProfile()
    .pipe(
      map((profile) =>
        profile?.isOnboarded ? router.parseUrl('/dashboard') : true,
      ),
    );
};
