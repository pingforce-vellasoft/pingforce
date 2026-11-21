import { cachedIdentity, type IdentityCache } from './identity-cache';

function cacheWith(row: { tokenVersion: number } | null) {
  const store = new Map<string, unknown>(row ? [['k', row]] : []);
  const cache: IdentityCache & { set: jest.Mock } = {
    get: jest.fn(async (key: string) => store.get(key) as never),
    set: jest.fn(async (key: string, value: unknown) => store.set(key, value)),
  };
  return cache;
}

describe('cachedIdentity', () => {
  it('serves a current cached row without loading', async () => {
    const cache = cacheWith({ tokenVersion: 3 });
    const load = jest.fn();
    await expect(cachedIdentity(cache, 'k', 3, load)).resolves.toEqual({
      tokenVersion: 3,
    });
    expect(load).not.toHaveBeenCalled();
  });

  it('re-reads when the token is newer than the cache (sign-in after password change)', async () => {
    const cache = cacheWith({ tokenVersion: 3 });
    const load = jest.fn().mockResolvedValue({ tokenVersion: 4 });
    await expect(cachedIdentity(cache, 'k', 4, load)).resolves.toEqual({
      tokenVersion: 4,
    });
    expect(load).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith('k', { tokenVersion: 4 }, 5_000);
  });

  it('answers an old revoked token from cache, without a database read', async () => {
    const cache = cacheWith({ tokenVersion: 4 });
    const load = jest.fn();
    const row = await cachedIdentity(cache, 'k', 3, load);
    expect(row?.tokenVersion).toBe(4); // caller then rejects: 4 !== 3
    expect(load).not.toHaveBeenCalled();
  });

  it('loads and caches on a miss', async () => {
    const cache = cacheWith(null);
    const load = jest.fn().mockResolvedValue({ tokenVersion: 1 });
    await cachedIdentity(cache, 'k', 1, load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalled();
  });

  it('does not cache a missing identity', async () => {
    const cache = cacheWith(null);
    await expect(
      cachedIdentity(cache, 'k', 1, jest.fn().mockResolvedValue(null)),
    ).resolves.toBeNull();
    expect(cache.set).not.toHaveBeenCalled();
  });
});
