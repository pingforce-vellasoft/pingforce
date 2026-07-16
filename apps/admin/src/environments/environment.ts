/**
 * Development environment. Empty apiUrl keeps requests relative so the
 * nx serve dev-proxy (proxy.conf.json → localhost:3000) handles them.
 * Replaced by environment.prod.ts in production builds (fileReplacements).
 */
export const environment = {
  production: false,
  apiUrl: '',
};
