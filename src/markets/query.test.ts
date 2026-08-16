import { describe, expect, it } from "vitest";
import {
  parseMarketQuery,
  buildMarketsResponse,
  zipListingsHref,
  homeHref,
} from "@/markets/query";
import { grossYield, type MarketRow } from "@/markets/rank";
import type { MarketsFile } from "@/markets/file";

describe("parseMarketQuery", () => {
  it("defaults to $90k–$240k and average-or-better crime", () => {
    expect(parseMarketQuery(new URLSearchParams())).toEqual({
      country: "US",
      minPrice: 90_000,
      maxPrice: 240_000,
      crimeFilter: "averageOrBetter",
      state: undefined,
      minPopulation: 0,
      sort: "yieldDesc",
      page: 1,
    });
  });

  it("parses rent estimate sort", () => {
    expect(parseMarketQuery(new URLSearchParams({ sort: "rentDesc" })).sort).toBe("rentDesc");
    expect(parseMarketQuery(new URLSearchParams({ sort: "rentAsc" })).sort).toBe("rentAsc");
  });

  it("parses overrides", () => {
    const params = new URLSearchParams({
      minPrice: "90000",
      maxPrice: "350000",
      crimeFilter: "excludeHigh",
      state: "ok",
      minPopulation: "5000",
    });
    expect(parseMarketQuery(params)).toEqual({
      country: "US",
      minPrice: 90_000,
      maxPrice: 350_000,
      crimeFilter: "excludeHigh",
      state: "OK",
      minPopulation: 5_000,
      sort: "yieldDesc",
      page: 1,
    });
  });
});

describe("zip and home hrefs", () => {
  it("builds a listings URL for a ZIP", () => {
    expect(
      zipListingsHref("73103", {
        minPrice: 90_000,
        maxPrice: 240_000,
        crimeFilter: "averageOrBetter",
      }),
    ).toBe("/zips/73103?minPrice=90000&maxPrice=240000&crimeFilter=averageOrBetter");
  });

  it("parses supported country codes", () => {
    expect(parseMarketQuery(new URLSearchParams({ country: "MX" })).country).toBe("MX");
    expect(parseMarketQuery(new URLSearchParams({ country: "ZZ" })).country).toBe("US");
  });

  it("builds a home URL that restores filters", () => {
    expect(
      homeHref({
        minPrice: 90_000,
        maxPrice: 240_000,
        crimeFilter: "excludeHigh",
        state: "MS",
      }),
    ).toBe("/?minPrice=90000&maxPrice=240000&crimeFilter=excludeHigh&state=MS");
  });

  it("includes only country in home URL when not US", () => {
    expect(
      homeHref({
        country: "MX",
        minPrice: 90_000,
        maxPrice: 240_000,
        crimeFilter: "averageOrBetter",
      }),
    ).toBe("/?country=MX");
    expect(
      homeHref({
        country: "AR",
        minPrice: 90_000,
        maxPrice: 240_000,
        crimeFilter: "averageOrBetter",
      }),
    ).toBe("/?country=AR");
  });
});

describe("buildMarketsResponse", () => {
  it("returns yield-sorted ZIPs and drops high-crime cheap markets", () => {
    const file: MarketsFile = {
      generatedAt: "2026-08-15T00:00:00.000Z",
      sources: { zhvi: "zhvi", zori: "zori", crime: "crime" },
      nationalCrimeRate: 370,
      markets: [
        row("48201", 80_000, 1_200, 2_000),
        row("73103", 180_000, 1_400, 250),
        row("65802", 150_000, 900, 180),
      ],
    };
    const result = buildMarketsResponse(file, new URLSearchParams());
    expect(result.markets.map((m) => m.zip)).toEqual(["73103", "65802"]);
    expect(result.total).toBe(2);
    expect(result.states).toEqual(["OK"]);
  });
});

function row(zip: string, zhvi: number, zori: number, crimeRate: number): MarketRow {
  return {
    zip,
    city: zip,
    state: "OK",
    county: "Test",
    zhvi,
    zori,
    grossYield: grossYield(zori, zhvi)!,
    crimeRate,
    crimeVsNational: crimeRate / 370,
    population: 10_000,
  };
}
