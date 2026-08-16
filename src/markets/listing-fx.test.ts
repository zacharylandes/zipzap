import { describe, expect, it, vi } from "vitest";
import { applyLocalCurrency } from "@/markets/listing-fx";
import * as fx from "@/markets/fx";

describe("applyLocalCurrency", () => {
  it("converts foreign listing prices into the search country currency", async () => {
    vi.spyOn(fx, "fetchFxRate").mockResolvedValue(1000);

    const [converted] = await applyLocalCurrency(
      [
        {
          id: "1",
          sourceId: "mercadolibre-inmuebles",
          sourceName: "MercadoLibre Inmuebles",
          title: "Palermo flat",
          price: 826_800,
          currency: "USD",
          bedrooms: 3,
          bathrooms: 2,
          area: 120,
          areaUnit: "sqm",
          location: "capital-federal",
          thumbnailUrl: null,
          url: "https://example.com/listing",
        },
      ],
      "ARS",
    );

    expect(converted?.price).toBe(826_800_000);
    expect(converted?.currency).toBe("ARS");
    expect(converted?.originalPrice).toBe(826_800);
    expect(converted?.originalCurrency).toBe("USD");
  });
});
