import { describe, expect, it } from "vitest";
import { latestNumeric, parseCsv, parseWideIndex } from "@/markets/csv";
import { countyKey, joinMarkets, type CrimeCounty } from "@/markets/join";

describe("parseCsv", () => {
  it("parses quoted commas", () => {
    const rows = parseCsv('a,b\n"1,000",two\n');
    expect(rows).toEqual([
      ["a", "b"],
      ["1,000", "two"],
    ]);
  });
});

describe("parseWideIndex", () => {
  it("reads RegionName as zip and the last date column as the latest value", () => {
    const csv = [
      "RegionID,RegionName,State,City,CountyName,2024-01-31,2024-02-29",
      "1,73103,OK,Oklahoma City,Oklahoma County,170000,180000",
      "2,48201,MI,Detroit,Wayne County,70000,80000",
    ].join("\n");
    const index = parseWideIndex(csv);
    expect(index.get("73103")).toEqual({
      zip: "73103",
      state: "OK",
      city: "Oklahoma City",
      county: "Oklahoma County",
      value: 180000,
    });
    expect(index.get("48201")?.value).toBe(80000);
  });
});

describe("latestNumeric", () => {
  it("walks right-to-left for the last finite number", () => {
    expect(latestNumeric(["x", "1", "", "2.5", "NA"])).toBe(2.5);
    expect(latestNumeric(["a", "b"])).toBeNull();
  });
});

describe("countyKey", () => {
  it("strips county/parish suffixes and normalizes punctuation", () => {
    expect(countyKey("Oklahoma County", "OK")).toBe(countyKey("Oklahoma", "ok"));
    expect(countyKey("St. Louis", "MO")).toBe(countyKey("Saint Louis County", "MO"));
  });
});

describe("joinMarkets", () => {
  it("keeps ZIPs with both value and rent and attaches county crime", () => {
    const zhvi = parseWideIndex(
      "RegionName,State,City,CountyName,2024-02-29\n73103,OK,Oklahoma City,Oklahoma County,180000\n99999,TX,Nowhere,Harris County,90000\n",
    );
    const zori = parseWideIndex(
      "RegionName,State,City,CountyName,2024-02-29\n73103,OK,Oklahoma City,Oklahoma County,1400\n",
    );
    const crime = new Map<string, CrimeCounty>([
      [
        countyKey("Oklahoma", "OK"),
        { county: "Oklahoma", state: "OK", crimeRate: 250 },
      ],
    ]);
    const { markets, nationalCrimeRate } = joinMarkets({
      zhvi,
      zori,
      crime,
      nationalCrimeRate: 370,
    });
    expect(nationalCrimeRate).toBe(370);
    expect(markets).toHaveLength(1);
    expect(markets[0]).toMatchObject({
      zip: "73103",
      zhvi: 180000,
      zori: 1400,
      crimeRate: 250,
    });
    expect(markets[0]!.grossYield).toBeCloseTo((1400 * 12) / 180000);
    expect(markets[0]!.crimeVsNational).toBeCloseTo(250 / 370);
  });

  it("drops ZIPs whose county has no crime data", () => {
    const zhvi = parseWideIndex(
      "RegionName,State,City,CountyName,d\n11111,TX,Austin,Travis County,200000\n",
    );
    const zori = parseWideIndex(
      "RegionName,State,City,CountyName,d\n11111,TX,Austin,Travis County,1500\n",
    );
    const { markets } = joinMarkets({
      zhvi,
      zori,
      crime: new Map(),
      nationalCrimeRate: 370,
    });
    expect(markets).toHaveLength(0);
  });
});
