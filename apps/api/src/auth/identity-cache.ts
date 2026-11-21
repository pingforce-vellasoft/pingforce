/** The two cache-manager calls the JWT strategy uses. */
export interface IdentityCache {
  get<T>(key: string): Promise<T | undefined | null>;
  set(key: string, value: unknown, ttlMs: number): Promise<unknown>;
}

export const IDENTITY_CACHE_TTL_MS = 5_000;

/**
 * Identity row for a token, cached for a few seconds so revocation stays fast
 * without a database read per request.
 *
 * A cached row OLDER than the token (lower tokenVersion) is re-read before the
 * token is judged: a password change or logout-all bumps tokenVersion, and
 * signing in again inside the cache window otherwise got the brand-new token
 * refused as "Token revoked", and kept serving stale flags such as
 * mustChangePassword. An old, revoked token is answered from cache, so it
 * cannot force a database read on every request.
 */
export async function cachedIdentity<T extends { tokenVersion: number }>(
  cache: IdentityCache,
  key: string,
  tokenVersion: number,
  load: () => Promise<T | null>,
): Promise<T | null> {
  const cached = await cache.get<T>(key);
  if (cached && cached.tokenVersion >= tokenVersion) return cached;
  const fresh = await load();
  if (fresh) await cache.set(key, fresh, IDENTITY_CACHE_TTL_MS);
  return fresh;
}
