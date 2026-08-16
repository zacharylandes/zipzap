import { describe, expect, it } from "vitest";
import { getSupportedCountries } from "@/search/registry";
import { COUNTRIES, COUNTRY_LABELS } from "@/search/schema";

describe("getSupportedCountries", () => {
  it("returns only countries with listing adapters", () => {
    const supported = getSupportedCountries();
    expect(supported).toEqual(expect.arrayContaining(["MX", "ES", "US", "CO", "CL", "AR", "PE"]));
    expect(supported).not.toContain("IT");
    expect(supported.every((code) => COUNTRIES.includes(code))).toBe(true);
    expect(supported.every((code) => COUNTRY_LABELS[code])).toBe(true);
  });
});
