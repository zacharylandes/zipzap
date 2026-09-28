import { describe, expect, it } from "vitest";
import { lotAreaConversions, parseStratmapBuilding, rawString } from "@/lib/enrichment/stratmap-attrs";

describe("stratmap attrs", () => {
  it("converts acres to sqft as derived", () => {
    const c = lotAreaConversions(11.96801239, "Acres");
    expect(c.acres).toBeCloseTo(11.968, 3);
    expect(c.sqft).toBeCloseTo(11.96801239 * 43560, 0);
    expect(c.sqftDerived).toBe(true);
  });

  it("reads stratmap appraisal fields from raw payload keys", () => {
    const raw = {
      YEAR_BUILT: 1985,
      STAT_LAND_USE: "A1",
      MKT_VALUE: 1_250_000,
      LAND_VALUE: 900_000,
      IMPROVEMENT: 350_000,
      TAX_YEAR: 2025,
    };
    const building = parseStratmapBuilding(raw);
    expect(building.yearBuilt).toBe(1985);
    expect(building.assessedValue).toBe(1_250_000);
    expect(building.landUse).toBe("A1");
    expect(rawString(raw, "missing")).toBeNull();
  });
});
