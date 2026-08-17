import { describe, expect, it } from "vitest";
import { redfinAdapter } from "@/search/adapters/redfin";
import {
  buildRedfinGisUrl,
  redfinMarketSlug,
} from "@/search/adapters/redfin-fetch";

describe("redfin GIS URL", () => {
  it("slugs city names the way Redfin markets are named", () => {
    expect(redfinMarketSlug("Youngstown, OH")).toBe("youngstown");
    expect(redfinMarketSlug("Oklahoma City, OK")).toBe("oklahomacity");
    expect(redfinMarketSlug("44505")).toBe("");
  });

  it("builds a GIS query around the ZIP centroid", () => {
    const lat = 41.1257;
    const lng = -80.6277;
    const url = new URL(
      buildRedfinGisUrl({
        marketSlug: "youngstown",
        lat,
        lng,
      }),
    );
    expect(url.origin + url.pathname).toBe("https://www.redfin.com/stingray/api/gis");
    expect(url.searchParams.get("market")).toBe("youngstown");
    expect(url.searchParams.get("num_homes")).toBe("350");
    expect(url.searchParams.get("status")).toBe("9");
    const poly = url.searchParams.get("poly") ?? "";
    const points = poly.split(",").map((pair) => {
      const [x, y] = pair.trim().split(/\s+/).map(Number);
      return { lng: x, lat: y };
    });
    expect(points.length).toBeGreaterThanOrEqual(4);
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    expect(Math.min(...lats)).toBeLessThan(lat);
    expect(Math.max(...lats)).toBeGreaterThan(lat);
    expect(Math.min(...lngs)).toBeLessThan(lng);
    expect(Math.max(...lngs)).toBeGreaterThan(lng);
  });
});

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
