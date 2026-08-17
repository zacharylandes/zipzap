import { describe, expect, it } from "vitest";
import { enrichListings, enrichListingsWithNumbeo, sortSearchListings } from "@/markets/enrich";
import { grossYield, type MarketRow } from "@/markets/rank";
import type { Listing } from "@/search/schema";

function listing(overrides: Partial<Listing> & Pick<Listing, "id" | "price" | "title">): Listing {
  return {
    sourceId: "realtor",
    sourceName: "Realtor.com",
    currency: "USD",
    bedrooms: 3,
    bathrooms: 2,
    area: 1400,
    areaUnit: "sqft",
    location: "Oklahoma City",
    thumbnailUrl: null,
    url: `https://example.com/${overrides.id}`,
    ...overrides,
  };
}

const market: MarketRow = {
  zip: "73103",
  city: "Oklahoma City",
  state: "OK",
  county: "Oklahoma",
  zhvi: 180_000,
  zori: 1_400,
  grossYield: grossYield(1_400, 180_000)!,
  crimeRate: 250,
  crimeVsNational: 250 / 370,
  population: 12_000,
};

describe("enrichListings", () => {
  it("attaches ZIP rent, yield, and crime from the parent market", () => {
    const [enriched] = enrichListings(
      [listing({ id: "cheap", title: "Bungalow", price: 120_000 })],
      market,
    );
    expect(enriched?.estimatedMonthlyRent).toBe(1_400);
    expect(enriched?.rentEstimateSource).toBe("zori");
    expect(enriched?.grossYield).toBeCloseTo(
      grossYield(1_400, 120_000, market.propertyTaxRate ?? 0)!,
    );
    expect(enriched?.crimeVsNational).toBeCloseTo(250 / 370);
    expect(enriched?.zip).toBe("73103");
  });

  it("leaves yield null when price is missing", () => {
    const [enriched] = enrichListings(
      [listing({ id: "na", title: "Unknown", price: null })],
      market,
    );
    expect(enriched?.estimatedMonthlyRent).toBe(1_400);
    expect(enriched?.grossYield).toBeNull();
  });
});

describe("enrichListingsWithNumbeo", () => {
  const rents = { oneBedroom: 522, threeBedroom: 890 };

  it("estimates gross yield on sale listings from Numbeo rent", () => {
    const [enriched] = enrichListingsWithNumbeo(
      [listing({ id: "mx", title: "Condo", price: 2_000_000, currency: "MXN", bedrooms: 1 })],
      rents,
    );
    expect(enriched?.estimatedMonthlyRent).toBe(522);
    expect(enriched?.rentEstimateSource).toBe("numbeo");
    expect(enriched?.grossYield).toBeCloseTo((522 * 12) / 2_000_000);
  });

  it("uses 3BR Numbeo rent for 3-bedroom listings", () => {
    const [enriched] = enrichListingsWithNumbeo(
      [listing({ id: "3br", title: "3 bed", price: 100_000, bedrooms: 3 })],
      rents,
    );
    expect(enriched?.estimatedMonthlyRent).toBe(890);
    expect(enriched?.grossYield).toBeCloseTo((890 * 12) / 100_000);
  });

  it("uses the midpoint of 1BR and 3BR for 2-bedroom listings", () => {
    const [enriched] = enrichListingsWithNumbeo(
      [listing({ id: "2br", title: "2 bed", price: 100_000, bedrooms: 2 })],
      rents,
    );
    expect(enriched?.estimatedMonthlyRent).toBe(706);
  });

  it("uses 1BR Numbeo rent when bedrooms are missing", () => {
    const [enriched] = enrichListingsWithNumbeo(
      [listing({ id: "unk", title: "Unknown", price: 100_000, bedrooms: null })],
      rents,
    );
    expect(enriched?.estimatedMonthlyRent).toBe(522);
  });

  it("falls back to 1BR for every bedroom count when 3BR rent is missing", () => {
    const [oneBed, threeBed] = enrichListingsWithNumbeo(
      [
        listing({ id: "1br", title: "1 bed", price: 100_000, bedrooms: 1 }),
        listing({ id: "3br", title: "3 bed", price: 100_000, bedrooms: 3 }),
      ],
      { oneBedroom: 522, threeBedroom: null },
    );
    expect(oneBed?.estimatedMonthlyRent).toBe(522);
    expect(threeBed?.estimatedMonthlyRent).toBe(522);
  });
});

describe("sortSearchListings", () => {
  it("sorts by gross yield descending when requested", () => {
    const listings = enrichListings(
      [
        listing({ id: "low", title: "Low", price: 200_000 }),
        listing({ id: "high", title: "High", price: 100_000 }),
      ],
      market,
    );
    expect(sortSearchListings(listings, "yieldDesc").map((row) => row.id)).toEqual(["high", "low"]);
  });

  it("sorts by price descending for investor listings", () => {
    const listings = enrichListings(
      [
        listing({ id: "low", title: "Low", price: 100_000 }),
        listing({ id: "high", title: "High", price: 200_000 }),
      ],
      market,
    );
    expect(sortSearchListings(listings, "priceDesc").map((row) => row.id)).toEqual(["high", "low"]);
  });

  it("sorts by price ascending when requested", () => {
    const listings = [
      listing({ id: "b", title: "B", price: 200_000 }),
      listing({ id: "a", title: "A", price: 100_000 }),
    ];
    expect(sortSearchListings(listings, "priceAsc").map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("sorts by rent estimate descending when requested", () => {
    const listings = [
      listing({ id: "low", title: "Low", price: 100_000, estimatedMonthlyRent: 900 }),
      listing({ id: "high", title: "High", price: 100_000, estimatedMonthlyRent: 1_800 }),
    ];
    expect(sortSearchListings(listings, "rentDesc").map((row) => row.id)).toEqual(["high", "low"]);
  });

  it("sorts by rent estimate ascending when requested", () => {
    const listings = [
      listing({ id: "high", title: "High", price: 100_000, estimatedMonthlyRent: 1_800 }),
      listing({ id: "low", title: "Low", price: 100_000, estimatedMonthlyRent: 900 }),
    ];
    expect(sortSearchListings(listings, "rentAsc").map((row) => row.id)).toEqual(["low", "high"]);
  });
});
