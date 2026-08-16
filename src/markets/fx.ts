const FX_API = "https://open.er-api.com/v6/latest";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type FxCacheEntry = {
  expiresAt: number;
  rates: Record<string, number>;
};

const cache = new Map<string, FxCacheEntry>();

export async function fetchFxRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;

  const key = from.toUpperCase();
  const target = to.toUpperCase();
  const now = Date.now();
  let entry = cache.get(key);

  if (!entry || entry.expiresAt <= now) {
    try {
      const res = await fetch(`${FX_API}/${encodeURIComponent(key)}`, {
        headers: { "user-agent": "house-search/0.1" },
        next: { revalidate: 43_200 },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        result?: string;
        rates?: Record<string, number>;
      };
      if (data.result !== "success") return null;
      entry = {
        expiresAt: now + CACHE_TTL_MS,
        rates: data.rates ?? {},
      };
      cache.set(key, entry);
    } catch {
      return null;
    }
  }

  const rate = entry.rates[target];
  return typeof rate === "number" && rate > 0 ? rate : null;
}

export function convertAmount(amount: number, rate: number): number {
  return Math.round(amount * rate);
}

export function resetFxCacheForTests() {
  cache.clear();
}
