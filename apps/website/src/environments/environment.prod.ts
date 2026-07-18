/**
 * Production environment. The marketing site is served from Firebase Hosting
 * (pingforce.in); the public billing API lives on OCI behind
 * api.pingforce.in, so requests must be absolute.
 */
export const environment = {
  production: true,
  apiUrl: 'https://api.pingforce.in',
  // Admin portal — signup/verify/onboarding continue here after a plan is chosen.
  adminUrl: 'https://admin.pingforce.in',
};
