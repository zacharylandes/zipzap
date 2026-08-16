import { describe, expect, it } from "vitest";
import { parseNumbeoMonthlyRent } from "@/markets/numbeo-parse";

describe("parseNumbeoMonthlyRent", () => {
  it("parses outside-centre rent from a Numbeo table row", () => {
    const html = `
      <table>
        <tr>
          <td>1 Bedroom Apartment Outside of City Centre</td>
          <td>Mex$12,163.67</td>
          <td>9,000.00-17,000.00</td>
        </tr>
      </table>
    `;
    expect(parseNumbeoMonthlyRent(html)).toBeCloseTo(12163.67, 2);
  });

  it("falls back to city-centre rent", () => {
    const html = `
      <table>
        <tr>
          <td>1 Bedroom Apartment in City Centre</td>
          <td>850.00 €</td>
        </tr>
      </table>
    `;
    expect(parseNumbeoMonthlyRent(html)).toBe(850);
  });
});
