import { describe, expect, it } from "vitest";
import { convertAmount } from "@/markets/fx";

describe("convertAmount", () => {
  it("multiplies by the exchange rate", () => {
    expect(convertAmount(826_800, 1488.6984)).toBe(1_230_855_837);
  });
});
