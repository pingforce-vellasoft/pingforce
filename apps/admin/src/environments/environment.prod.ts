/**
 * Production environment. Admin portal is served from Firebase Hosting
 * (admin.pingforce.in); the API lives on OCI behind admin-api.pingforce.in,
 * so requests must be absolute.
 */
export const environment = {
  production: true,
  apiUrl: 'https://admin-api.pingforce.in',
};
