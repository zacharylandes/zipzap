import { describe, expect, it } from "vitest";
import { findNumbeoRent } from "@/markets/numbeo";

describe("findNumbeoRent", () => {
  it("stores a higher 3BR Numbeo rent for Buenos Aires", () => {
    const entry = findNumbeoRent("capital-federal");
    expect(entry?.monthlyRent).toBeCloseTo(521.64);
    expect(entry?.monthlyRent3br).toBeCloseTo(1281.7);
  });
});
