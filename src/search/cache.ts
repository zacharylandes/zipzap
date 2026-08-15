import { SEARCH_CACHE_TTL_MS, type SearchResponse } from "@/search/schema";

type CacheEntry = {
  expiresAt: number;
  value: SearchResponse;
};

const store = new Map<string, CacheEntry>();

export function cacheKey(normalized: string): string {
  return normalized;
}

export function getCached(key: string, now = Date.now()): SearchResponse | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    store.delete(key);
    return null;
  }
  return { ...entry.value, cached: true };
}

export function setCached(
  key: string,
  value: SearchResponse,
  ttlMs = SEARCH_CACHE_TTL_MS,
  now = Date.now(),
): void {
  store.set(key, {
    expiresAt: now + ttlMs,
    value: { ...value, cached: false },
  });
}

export function clearSearchCache(): void {
  store.clear();
}
