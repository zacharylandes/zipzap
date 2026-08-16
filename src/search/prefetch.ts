import { getCached } from "@/search/cache";
import { runSearch, searchCacheKey } from "@/search/search";
import type { SearchInput, SearchResponse } from "@/search/schema";

export const PREFETCH_TOP_ZIP_COUNT = 8;
export const PREFETCH_CONCURRENCY = 2;

type ZipMarket = {
  zip: string;
  city: string;
  state: string;
};

type PrefetchQuery = {
  minPrice: number;
  maxPrice: number;
  country?: string;
};

type PrefetchOptions = {
  search?: (input: SearchInput) => Promise<SearchResponse>;
  concurrency?: number;
};

type PrefetchJob = {
  key: string;
  run: () => Promise<void>;
};

const queuedKeys = new Set<string>();
const inflightKeys = new Set<string>();
const queue: PrefetchJob[] = [];
let active = 0;

export function resetPrefetchQueueForTests() {
  queuedKeys.clear();
  inflightKeys.clear();
  queue.length = 0;
  active = 0;
}

export function zipListingsSearchInput(
  market: ZipMarket,
  minPrice: number,
  maxPrice: number,
): SearchInput {
  return {
    country: "US",
    location: market.city && market.state ? `${market.city}, ${market.state}` : market.zip,
    listingType: "sale",
    minPrice,
    maxPrice,
    zip: market.zip,
  };
}

export function schedulePrefetchTopZipListings(
  markets: ZipMarket[],
  query: PrefetchQuery,
  options: PrefetchOptions = {},
) {
  if (query.country && query.country !== "US") return;
  if (process.env.HOUSE_SEARCH_MOCK_SEARCH === "1") return;

  const search = options.search ?? runSearch;
  const concurrency = options.concurrency ?? PREFETCH_CONCURRENCY;

  for (const market of markets.slice(0, PREFETCH_TOP_ZIP_COUNT)) {
    const input = zipListingsSearchInput(market, query.minPrice, query.maxPrice);
    const key = searchCacheKey(input);
    if (getCached(key) || queuedKeys.has(key) || inflightKeys.has(key)) continue;
    queuedKeys.add(key);
    queue.push({
      key,
      run: async () => {
        try {
          if (getCached(key)) return;
          await search(input);
        } catch {
          // Prefetch is best-effort; the ZIP page will scrape on demand.
        } finally {
          inflightKeys.delete(key);
        }
      },
    });
  }

  pump(concurrency);
}

function pump(concurrency: number) {
  while (active < concurrency && queue.length > 0) {
    const job = queue.shift();
    if (!job) break;
    queuedKeys.delete(job.key);
    inflightKeys.add(job.key);
    active += 1;
    void job.run().finally(() => {
      active -= 1;
      pump(concurrency);
    });
  }
}
