export const environment = {
  production: true,
  // QA web and API share a host; Caddy proxies /api/* to the isolated backend.
  apiUrl: '',
};
