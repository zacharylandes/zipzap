import { describe, expect, it } from "vitest";
import { redfinAdapter } from "@/search/adapters/redfin";

describe("redfinAdapter live ZIP search", () => {
  it("returns Tulsa 74126 sale listings without Realtor.com", async () => {
    const result = await redfinAdapter.search({
      country: "US",
      location: "Tulsa, OK",
      listingType: "sale",
      minPrice: 90_000,
      maxPrice: 240_000,
      zip: "74126",
    });

    expect(result.status.status, result.status.message).toBe("ok");
    expect(result.listings.length).toBeGreaterThan(0);
    expect(result.listings[0]?.url).toMatch(/^https:\/\/www\.redfin\.com\//);
    expect(result.listings[0]?.currency).toBe("USD");
    expect(result.listings[0]?.title.length).toBeGreaterThan(0);
  }, 60_000);
});
