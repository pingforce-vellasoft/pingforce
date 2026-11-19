// Jest-only stand-in for decode-uri-component@0.5.1, which is ESM-only.
// package.json overrides it under minio's query-string@7; Node 22 loads it at
// runtime via require(esm), but Jest's CommonJS loader cannot. minio only
// calls query-string.stringify (asserted in
// .github/scripts/check-dependency-compatibility.cjs), so this never decodes
// real input — it just lets specs import StorageService.
module.exports = function decodeUriComponent(encodedURI) {
  try {
    return decodeURIComponent(encodedURI);
  } catch {
    return encodedURI;
  }
};
