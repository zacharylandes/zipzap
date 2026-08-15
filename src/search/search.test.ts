import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSearchCache, getCached, setCached } from "@/search/cache";
import { dedupeListings } from "@/search/dedupe";
import type { Listing, SearchResponse } from "@/search/schema";

describe("search cache", () => {
  beforeEach(() => clearSearchCache());

  it("returns cached values within TTL and expires after", () => {
    const value: SearchResponse = {
      listings: [],
      sources: [],
      cached: false,
      currency: "USD",
      country: "US",
    };
    setCached("k", value, 1000, 1000);
    expect(getCached("k", 1500)?.cached).toBe(true);
    expect(getCached("k", 2500)).toBeNull();
  });
});

describe("dedupeListings", () => {
  it("dedupes by canonical URL and signature", () => {
    const listings: Listing[] = [
      {
        id: "1",
        sourceId: "a",
        sourceName: "A",
        title: "Loft",
        price: 100,
        currency: "USD",
        bedrooms: 1,
        bathrooms: 1,
        area: 50,
        areaUnit: "sqm",
        location: "Austin",
        thumbnailUrl: null,
        url: "https://example.com/x?utm_source=x",
      },
      {
        id: "2",
        sourceId: "a",
        sourceName: "A",
        title: "Loft",
        price: 100,
        currency: "USD",
        bedrooms: 1,
        bathrooms: 1,
        area: 50,
        areaUnit: "sqm",
        location: "Austin",
        thumbnailUrl: null,
        url: "https://example.com/x",
      },
    ];
    expect(dedupeListings(listings)).toHaveLength(1);
  });
});

describe("runSearch isolation", () => {
  it("does not call Firecrawl before an explicit request module import", async () => {
    const scrape = vi.fn();
    vi.resetModules();
    vi.doMock("@/firecrawl/client", () => ({
      getFirecrawlClient: () => ({ scrape }),
    }));
    await import("@/search/search");
    expect(scrape).not.toHaveBeenCalled();
  });
});
