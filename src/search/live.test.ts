import { describe, expect, it } from "vitest";
import { runSearch } from "@/search/search";
import { COUNTRY_CURRENCY, type CountryCode, type SearchInput } from "@/search/schema";

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
    name: "United States / Redfin",
    input: { country: "US", location: "Tulsa, OK", listingType: "sale", zip: "74126", maxPrice: 240000 },
  },
  {
    name: "Spain / Pisos.com",
    input: { country: "ES", location: "madrid-madrid", listingType: "sale", maxPrice: 400_000 },
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
        expect(listing.currency).toBe(COUNTRY_CURRENCY[input.country]);
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
      zip: "90011",
    });
    for (const source of result.sources) {
      expect(source.count).toBeLessThanOrEqual(20);
    }
  }, 180_000);
});
