import { describe, expect, it } from "vitest";
import { pisosAdapter } from "@/search/adapters/pisos";

describe("pisosAdapter live Spain search", () => {
  it("returns Madrid sale listings without Firecrawl", async () => {
    const result = await pisosAdapter.search({
      country: "ES",
      location: "madrid-madrid",
      listingType: "sale",
    });

    expect(result.status.status).toBe("ok");
    expect(result.listings.length).toBeGreaterThan(0);
    expect(result.listings[0]?.url).toMatch(/^https:\/\/www\.pisos\.com\//);
    expect(result.listings[0]?.currency).toBe("EUR");
    expect(result.listings[0]?.title.length).toBeGreaterThan(0);
  }, 20_000);
});
