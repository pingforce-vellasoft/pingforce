import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, UserProfile } from './auth.service';

/**
 * Onboarding collects a tenant profile (+ optional white-label branding), so it
 * only ever applies to tenant accounts. A platform SUPER_ADMIN has no tenant
 * profile by design and would otherwise be trapped on /onboarding forever.
 */
function needsOnboarding(profile: UserProfile): boolean {
  if (profile.roleCode === 'SUPER_ADMIN') {
    return false;
  }
  return !profile.isOnboarded;
}

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
    return needsOnboarding(current) ? router.parseUrl('/onboarding') : true;
  }

  // Profile not loaded yet (e.g. hard refresh) — fetch, then decide. A failed
  // fetch means the stored token is dead (expired/revoked), not that the
  // account is new: send it to /login, never to /onboarding.
  return authService.fetchProfile().pipe(
    map((profile) => {
      if (!profile) {
        return router.parseUrl('/login');
      }
      return needsOnboarding(profile) ? router.parseUrl('/onboarding') : true;
    }),
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
    return needsOnboarding(current) ? true : router.parseUrl('/dashboard');
  }

  return authService.fetchProfile().pipe(
    map((profile) => {
      if (!profile) {
        return router.parseUrl('/login');
      }
      return needsOnboarding(profile) ? true : router.parseUrl('/dashboard');
    }),
  );
};
