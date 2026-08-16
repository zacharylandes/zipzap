import { describe, expect, it, vi } from "vitest";
import { applyLocalCurrency, numbeoRentInLocalCurrency, numbeoRentsInLocalCurrency } from "@/markets/listing-fx";
import * as fx from "@/markets/fx";

describe("numbeoRentInLocalCurrency", () => {
  it("converts both 1BR and 3BR Numbeo rents into the search currency", async () => {
    vi.spyOn(fx, "fetchFxRate").mockResolvedValue(1500);

    await expect(
      numbeoRentsInLocalCurrency(
        {
          monthlyRent: 522,
          monthlyRent3br: 890,
          currency: "USD",
          numbeoCity: "Buenos-Aires",
          label: "Buenos Aires (CABA)",
        },
        "ARS",
      ),
    ).resolves.toEqual({ oneBedroom: 783_000, threeBedroom: 1_335_000 });
  });
  it("passes through Numbeo USD rent when search currency is USD", async () => {
    await expect(
      numbeoRentInLocalCurrency(
        {
          monthlyRent: 521.64,
          currency: "USD",
          numbeoCity: "Buenos-Aires",
          label: "Buenos Aires (CABA)",
        },
        "USD",
      ),
    ).resolves.toBe(521.64);
  });

  it("converts Numbeo USD rent into other local currencies for yield math", async () => {
    vi.spyOn(fx, "fetchFxRate").mockResolvedValue(1500);

    await expect(
      numbeoRentInLocalCurrency(
        {
          monthlyRent: 521.64,
          currency: "USD",
          numbeoCity: "Buenos-Aires",
          label: "Buenos Aires (CABA)",
        },
        "ARS",
      ),
    ).resolves.toBe(782_460);
  });
});

describe("applyLocalCurrency", () => {
  it("converts ARS listing prices into USD for Argentina searches", async () => {
    vi.spyOn(fx, "fetchFxRate").mockResolvedValue(1 / 1500);

    const [converted] = await applyLocalCurrency(
      [
        {
          id: "1",
          sourceId: "mercadolibre-inmuebles",
          sourceName: "MercadoLibre Inmuebles",
          title: "Palermo flat",
          price: 150_000_000,
          currency: "ARS",
          bedrooms: 3,
          bathrooms: 2,
          area: 120,
          areaUnit: "sqm",
          location: "capital-federal",
          thumbnailUrl: null,
          url: "https://example.com/listing",
        },
      ],
      "USD",
    );

    expect(converted?.price).toBe(100_000);
    expect(converted?.currency).toBe("USD");
    expect(converted?.originalPrice).toBe(150_000_000);
    expect(converted?.originalCurrency).toBe("ARS");
  });

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
