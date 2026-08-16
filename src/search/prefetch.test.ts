import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSearchCache, setCached } from "@/search/cache";
import { searchCacheKey } from "@/search/search";
import {
  PREFETCH_TOP_ZIP_COUNT,
  resetPrefetchQueueForTests,
  schedulePrefetchTopZipListings,
  zipListingsSearchInput,
} from "@/search/prefetch";
import type { SearchResponse } from "@/search/schema";

function market(zip: string) {
  return { zip, city: "Oklahoma City", state: "OK" };
}

const emptyResponse: SearchResponse = {
  listings: [],
  sources: [],
  cached: false,
  currency: "USD",
  country: "US",
};

describe("zipListingsSearchInput", () => {
  it("matches the ZIP page search payload", () => {
    expect(zipListingsSearchInput(market("73103"), 90_000, 240_000)).toEqual({
      country: "US",
      location: "Oklahoma City, OK",
      listingType: "sale",
      minPrice: 90_000,
      maxPrice: 240_000,
      zip: "73103",
    });
  });
});

describe("schedulePrefetchTopZipListings", () => {
  beforeEach(() => {
    clearSearchCache();
    resetPrefetchQueueForTests();
  });

  it("searches only the top N uncached ZIPs", async () => {
    const search = vi.fn(async () => emptyResponse);
    const markets = Array.from({ length: 12 }, (_, index) => market(String(73100 + index)));
    schedulePrefetchTopZipListings(markets, { minPrice: 90_000, maxPrice: 240_000 }, {
      search,
      concurrency: 12,
    });
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(PREFETCH_TOP_ZIP_COUNT));
    expect(search.mock.calls.map((call) => call[0].zip)).toEqual(
      markets.slice(0, PREFETCH_TOP_ZIP_COUNT).map((row) => row.zip),
    );
  });

  it("skips ZIPs already in the search cache", async () => {
    const search = vi.fn(async () => emptyResponse);
    const first = zipListingsSearchInput(market("73103"), 90_000, 240_000);
    setCached(searchCacheKey(first), emptyResponse);
    schedulePrefetchTopZipListings([market("73103"), market("73104")], {
      minPrice: 90_000,
      maxPrice: 240_000,
    }, { search, concurrency: 2 });
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    expect(search.mock.calls[0]?.[0].zip).toBe("73104");
  });

  it("does not start a second search for a ZIP already in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const search = vi.fn(async () => {
      await gate;
      return emptyResponse;
    });
    const markets = [market("73103"), market("73104")];
    const query = { minPrice: 90_000, maxPrice: 240_000 };
    schedulePrefetchTopZipListings(markets, query, { search, concurrency: 1 });
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    schedulePrefetchTopZipListings(markets, query, { search, concurrency: 1 });
    expect(search).toHaveBeenCalledTimes(1);
    release();
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(2));
  });
});
