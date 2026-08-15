import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_PRICE,
  DEFAULT_MIN_PRICE,
  filterAndRank,
  grossYield,
  type MarketRow,
} from "@/markets/rank";

const NATIONAL_CRIME = 370;

function market(overrides: Partial<MarketRow> & Pick<MarketRow, "zip">): MarketRow {
  const zhvi = overrides.zhvi ?? 180_000;
  const zori = overrides.zori ?? 1_200;
  const crimeRate = overrides.crimeRate ?? 200;
  return {
    zip: overrides.zip,
    city: overrides.city ?? "Springfield",
    state: overrides.state ?? "OH",
    county: overrides.county ?? "Clark",
    zhvi,
    zori,
    grossYield: overrides.grossYield ?? grossYield(zori, zhvi)!,
    crimeRate,
    crimeVsNational: overrides.crimeVsNational ?? crimeRate / NATIONAL_CRIME,
    population: overrides.population ?? 12_000,
  };
}

describe("grossYield", () => {
  it("is annual rent divided by purchase price", () => {
    expect(grossYield(1_500, 180_000)).toBeCloseTo((1_500 * 12) / 180_000);
  });

  it("returns null when price or rent is not positive", () => {
    expect(grossYield(1_200, 0)).toBeNull();
    expect(grossYield(0, 180_000)).toBeNull();
    expect(grossYield(1_200, -1)).toBeNull();
  });
});

describe("filterAndRank", () => {
  const cheapHighCrime = market({
    zip: "48201",
    city: "Detroit",
    state: "MI",
    county: "Wayne",
    zhvi: 80_000,
    zori: 1_200,
    crimeRate: 2_000,
  });
  const cheapLowCrime = market({
    zip: "73103",
    city: "Oklahoma City",
    state: "OK",
    county: "Oklahoma",
    zhvi: 180_000,
    zori: 1_400,
    crimeRate: 250,
  });
  const cheaperLowerYield = market({
    zip: "65802",
    city: "Springfield",
    state: "MO",
    county: "Greene",
    zhvi: 150_000,
    zori: 900,
    crimeRate: 180,
  });
  const expensiveHighYield = market({
    zip: "94110",
    city: "San Francisco",
    state: "CA",
    county: "San Francisco",
    zhvi: 400_000,
    zori: 4_000,
    crimeRate: 200,
  });

  it("defaults max price to $240k and drops homes above it", () => {
    expect(DEFAULT_MAX_PRICE).toBe(240_000);
    const ranked = filterAndRank(
      [cheapLowCrime, expensiveHighYield],
      { nationalCrimeRate: NATIONAL_CRIME },
    );
    expect(ranked.map((row) => row.zip)).toEqual(["73103"]);
  });

  it("defaults min price to $90k and drops cheaper markets", () => {
    expect(DEFAULT_MIN_PRICE).toBe(90_000);
    const belowFloor = market({ zip: "00002", zhvi: 85_000, zori: 1_100, crimeRate: 200 });
    const ranked = filterAndRank([belowFloor, cheapLowCrime], {
      nationalCrimeRate: NATIONAL_CRIME,
    });
    expect(ranked.map((row) => row.zip)).toEqual(["73103"]);
  });

  it("drops above-average crime even when yield is highest", () => {
    const ranked = filterAndRank(
      [cheapHighCrime, cheapLowCrime],
      { nationalCrimeRate: NATIONAL_CRIME, crimeFilter: "averageOrBetter" },
    );
    expect(ranked.map((row) => row.zip)).toEqual(["73103"]);
  });

  it("sorts by typical price descending by default", () => {
    const ranked = filterAndRank(
      [cheaperLowerYield, cheapLowCrime],
      { nationalCrimeRate: NATIONAL_CRIME },
    );
    expect(ranked.map((row) => row.zip)).toEqual(["73103", "65802"]);
    expect(ranked[0]!.zhvi).toBeGreaterThan(ranked[1]!.zhvi);
  });

  it("sorts by typical price ascending when requested", () => {
    const ranked = filterAndRank(
      [cheaperLowerYield, cheapLowCrime],
      { nationalCrimeRate: NATIONAL_CRIME, sort: "priceAsc" },
    );
    expect(ranked.map((row) => row.zip)).toEqual(["65802", "73103"]);
  });

  it("sorts by typical rent descending when requested", () => {
    const ranked = filterAndRank(
      [cheaperLowerYield, cheapLowCrime],
      { nationalCrimeRate: NATIONAL_CRIME, sort: "rentDesc" },
    );
    expect(ranked.map((row) => row.zip)).toEqual(["73103", "65802"]);
    expect(ranked[0]!.zori).toBeGreaterThan(ranked[1]!.zori);
  });

  it("sorts by typical rent ascending when requested", () => {
    const ranked = filterAndRank(
      [cheaperLowerYield, cheapLowCrime],
      { nationalCrimeRate: NATIONAL_CRIME, sort: "rentAsc" },
    );
    expect(ranked.map((row) => row.zip)).toEqual(["65802", "73103"]);
  });

  it("sorts by yield ascending when requested", () => {
    const ranked = filterAndRank(
      [cheaperLowerYield, cheapLowCrime],
      { nationalCrimeRate: NATIONAL_CRIME, sort: "yieldAsc" },
    );
    expect(ranked[0]!.grossYield).toBeLessThanOrEqual(ranked[1]!.grossYield);
  });

  it("excludeHigh keeps average crime and drops only the top quartile", () => {
    const rows = [
      market({ zip: "10001", crimeRate: 100 }),
      market({ zip: "10002", crimeRate: 200 }),
      market({ zip: "10003", crimeRate: 300 }),
      market({ zip: "10004", crimeRate: 900 }),
    ];
    const ranked = filterAndRank(rows, {
      nationalCrimeRate: NATIONAL_CRIME,
      crimeFilter: "excludeHigh",
      maxPrice: 500_000,
    });
    expect(ranked.map((row) => row.zip)).not.toContain("10004");
    expect(ranked.map((row) => row.zip).sort()).toEqual(["10001", "10002", "10003"]);
  });

  it("filters by state when provided", () => {
    const ranked = filterAndRank([cheapLowCrime, cheaperLowerYield], {
      nationalCrimeRate: NATIONAL_CRIME,
      state: "OK",
    });
    expect(ranked.map((row) => row.zip)).toEqual(["73103"]);
  });

  it("drops ZIPs below the population floor", () => {
    const tiny = market({ zip: "00001", population: 400, zori: 2_000, zhvi: 100_000 });
    const ranked = filterAndRank([tiny, cheapLowCrime], {
      nationalCrimeRate: NATIONAL_CRIME,
      minPopulation: 5_000,
    });
    expect(ranked.map((row) => row.zip)).toEqual(["73103"]);
  });
});
