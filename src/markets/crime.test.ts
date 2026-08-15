import { describe, expect, it } from "vitest";
import { countyKey } from "@/markets/join";
import { parseChrCrime } from "@/markets/crime";

describe("parseChrCrime", () => {
  it("reads violent crime raw values from a two-row County Health Rankings header", () => {
    const csv = [
      "FIPS,State,County,v043_rawvalue,v043_cilow",
      "fipscode,state,county,Violent crime raw value,Violent crime CI low",
      "00000,US,United States,370,360",
      "40000,OK,,400,390",
      "40109,OK,Oklahoma,250,240",
      "26163,MI,Wayne,2000,1900",
    ].join("\n");
    const { counties, nationalCrimeRate } = parseChrCrime(csv);
    expect(nationalCrimeRate).toBe(370);
    expect(counties.get(countyKey("Oklahoma", "OK"))?.crimeRate).toBe(250);
    expect(counties.get(countyKey("Wayne County", "MI"))?.crimeRate).toBe(2000);
    expect(counties.has(countyKey("", "OK"))).toBe(false);
  });

  it("reads State Abbreviation / Name headers and skips state aggregate FIPS", () => {
    const csv = [
      "County FIPS Code,State Abbreviation,Name,Violent crime raw value",
      "countycode,state,county,v043_rawvalue",
      "000,US,United States,370",
      "000,OK,Oklahoma,400",
      "109,OK,Oklahoma,250",
    ].join("\n");
    const { counties, nationalCrimeRate } = parseChrCrime(csv);
    expect(nationalCrimeRate).toBe(370);
    expect(counties.get(countyKey("Oklahoma County", "OK"))?.crimeRate).toBe(250);
  });
});
