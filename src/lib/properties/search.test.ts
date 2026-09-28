import { describe, expect, it } from "vitest";
import { matchProperties, type Matchable } from "@/lib/properties/match";
import { normalizeAddress, pageBounds } from "@/lib/properties/normalize";

const rows: Matchable[] = [
  {
    id: 1,
    parcelId: "100001",
    geoId: "GEO-100001",
    normalizedAddress: "100 CONGRESS AVE AUSTIN TX 78701",
    city: "AUSTIN",
    county: "TRAVIS",
  },
  {
    id: 2,
    parcelId: "100002",
    geoId: "GEO-100002",
    normalizedAddress: "100 CONGRESS AVE APT 2 AUSTIN TX 78701",
    city: "AUSTIN",
    county: "TRAVIS",
  },
  {
    id: 3,
    parcelId: "200001",
    geoId: "GEO-200001",
    normalizedAddress: "1401 ELM ST DALLAS TX 75202",
    city: "DALLAS",
    county: "DALLAS",
  },
  {
    id: 4,
    parcelId: "9002407",
    geoId: "GEO-9002407",
    normalizedAddress: "2407 S CONGRESS AVE STE E762 TX 78704",
    city: null,
    county: "TRAVIS",
  },
];

describe("property search", () => {
  it("normalizes addresses the same way ingest does", () => {
    expect(normalizeAddress("15715  FM 1853 , , TX")).toBe("15715 FM 1853 TX");
  });

  it("returns one parcel for an exact address", () => {
    const hits = matchProperties(rows, "1401 Elm St, Dallas, TX 75202");
    expect(hits.map((hit) => hit.parcelId)).toEqual(["200001"]);
  });

  it("returns several parcels for a shared street prefix", () => {
    const hits = matchProperties(rows, "100 Congress Ave");
    expect(hits.map((hit) => hit.id)).toEqual([1, 2]);
  });

  it("returns nothing when the address is not loaded", () => {
    expect(matchProperties(rows, "500 Main St, Houston, TX")).toEqual([]);
  });

  it("filters by county name", () => {
    expect(matchProperties(rows, "Travis").map((hit) => hit.county)).toEqual(["TRAVIS", "TRAVIS", "TRAVIS"]);
  });

  it("paginates after ranking", () => {
    const hits = matchProperties(rows, "100 Congress Ave");
    const { limit, offset } = pageBounds(2, 1, 50);
    expect(hits.slice(offset, offset + limit).map((hit) => hit.id)).toEqual([2]);
    expect(pageBounds(1, 500, 50).limit).toBe(50);
  });

  it("finds a parcel id", () => {
    expect(matchProperties(rows, "100001").map((hit) => hit.id)).toEqual([1]);
  });

  it("fuzzy-matches StratMap situs without city in the source row", () => {
    const hits = matchProperties(rows, "2407 South Congress Avenue, Austin, TX 78704");
    expect(hits.map((hit) => hit.id)).toEqual([4]);
  });

  it("does not match the same house number on a different street name", () => {
    const extra: Matchable[] = [
      ...rows,
      {
        id: 5,
        parcelId: "120927",
        geoId: "GEO-120927",
        normalizedAddress: "1206 W 6TH ST TX 78703",
        city: null,
        county: "TRAVIS",
      },
    ];
    expect(matchProperties(extra, "1206 Maple Ave, Austin, TX 78702").map((hit) => hit.id)).toEqual([]);
  });
});
