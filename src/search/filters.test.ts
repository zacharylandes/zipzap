import { describe, expect, it } from "vitest";
import { filterListingsBySearchInput } from "@/search/filters";
import type { Listing } from "@/search/schema";

function listing(price: number | null): Listing {
  return {
    id: "realtor:test",
    sourceId: "realtor",
    sourceName: "Realtor.com",
    title: "Test home",
    price,
    currency: "USD",
    bedrooms: 3,
    bathrooms: 2,
    area: 1500,
    areaUnit: "sqft",
    location: "Durant, OK",
    thumbnailUrl: null,
    url: "https://www.realtor.com/realestateandhomes-detail/test",
  };
}

describe("filterListingsBySearchInput", () => {
  it("drops listings above maxPrice and below minPrice", () => {
    const listings = [listing(180_000), listing(699_000), listing(240_000), listing(89_000)];
    const filtered = filterListingsBySearchInput(listings, {
      country: "US",
      location: "74701",
      listingType: "sale",
      minPrice: 90_000,
      maxPrice: 240_000,
      zip: "74701",
    });
    expect(filtered.map((row) => row.price)).toEqual([180_000, 240_000]);
  });

  it("drops listings with unknown price when a price filter is set", () => {
    const filtered = filterListingsBySearchInput([listing(null), listing(200_000)], {
      country: "US",
      location: "74701",
      listingType: "sale",
      maxPrice: 240_000,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.price).toBe(200_000);
  });
});
