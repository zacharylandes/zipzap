import { describe, expect, it } from "vitest";
import { runSearch } from "@/search/search";
import type { CountryCode, SearchInput } from "@/search/schema";

/**
 * Live end-to-end verification against real portals via Firecrawl.
 *
 * Skipped unless FIRECRAWL_LIVE=1 so CI and offline runs stay hermetic.
 * Consumes Firecrawl credits and hits live websites.
 *
 * Run: FIRECRAWL_LIVE=1 npm run test -- src/search/live.test.ts
 */
const LIVE = process.env.FIRECRAWL_LIVE === "1";
const describeLive = LIVE ? describe : describe.skip;

type Case = { name: string; input: SearchInput };

const cases: Case[] = [
  {
    name: "Mexico / Inmuebles24",
    input: { country: "MX", location: "Ciudad de Mexico", listingType: "rent", maxPrice: 25000 },
  },
  {
    name: "United States / Realtor.com",
    input: { country: "US", location: "Austin, TX", listingType: "sale", maxPrice: 700000 },
  },
];

describeLive("live search returns real listings", () => {
  it.each(cases)(
    "$name returns at least one valid listing (cap 20)",
    async ({ input }) => {
      const result = await runSearch(input);

      const okOrEmpty = result.sources.filter(
        (s) => s.status === "ok" || s.status === "empty",
      );
      expect(okOrEmpty.length).toBeGreaterThan(0);

      expect(result.listings.length).toBeGreaterThan(0);
      expect(result.listings.length).toBeLessThanOrEqual(20);

      for (const listing of result.listings) {
        expect(listing.title.length).toBeGreaterThan(0);
        expect(listing.url).toMatch(/^https?:\/\//);
        expect(listing.currency).toBe(
          input.country === "US" ? "USD" : "MXN",
        );
      }
    },
    180_000,
  );

  it("caps each source at 20 accepted listings", async () => {
    const country: CountryCode = "US";
    const result = await runSearch({
      country,
      location: "Los Angeles, CA",
      listingType: "sale",
    });
    for (const source of result.sources) {
      expect(source.count).toBeLessThanOrEqual(20);
    }
  }, 180_000);
});
