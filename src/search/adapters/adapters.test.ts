import { describe, expect, it } from "vitest";
import { inmuebles24Adapter } from "@/search/adapters/inmuebles24";
import { pisosAdapter } from "@/search/adapters/pisos";
import { realtorAdapter } from "@/search/adapters/realtor";
import { fincaraizAdapter } from "@/search/adapters/fincaraiz";
import { mercadolibreInmueblesAdapter, ML_MIN_PROPERTY_AGE_FILTER } from "@/search/adapters/mercadolibre-inmuebles";
import { immobiliareAdapter } from "@/search/adapters/immobiliare";
import {
  normalizeCurrency,
  normalizeRawListing,
} from "@/search/adapters/firecrawl-adapter";
import { MAX_LISTINGS_PER_SOURCE } from "@/search/schema";

describe("portal URL builders", () => {
  const base = {
    location: "Ciudad de Mexico",
    listingType: "rent" as const,
    maxPrice: 20000,
    bedrooms: 2,
  };

  it("builds Inmuebles24 URL", () => {
    expect(
      inmuebles24Adapter.buildSearchUrl({ ...base, country: "MX" }),
    ).toContain("inmuebles24.com/inmuebles-en-renta-en-ciudad-de-mexico.html");
  });

  it("builds Pisos.com URL from curated Spain slugs", () => {
    expect(
      pisosAdapter.buildSearchUrl({
        country: "ES",
        location: "madrid-madrid",
        listingType: "sale",
        maxPrice: 400000,
      }),
    ).toBe("https://www.pisos.com/venta/pisos-madrid/hasta-400000/");
  });

  it("maps Palma, A Coruña, and San Sebastián to working Pisos slugs", () => {
    expect(
      pisosAdapter.buildSearchUrl({
        country: "ES",
        location: "palma-de-mallorca-balears-illes",
        listingType: "sale",
      }),
    ).toBe("https://www.pisos.com/venta/pisos-palma_de_mallorca/");
    expect(
      pisosAdapter.buildSearchUrl({
        country: "ES",
        location: "a-coruna-a-coruna",
        listingType: "sale",
      }),
    ).toBe("https://www.pisos.com/venta/pisos-a_coruna/");
    expect(
      pisosAdapter.buildSearchUrl({
        country: "ES",
        location: "donostia-san-sebastian-gipuzkoa",
        listingType: "sale",
      }),
    ).toBe("https://www.pisos.com/venta/pisos-donostia_san_sebastian/");
  });

  it("builds Realtor URL", () => {
    expect(
      realtorAdapter.buildSearchUrl({
        country: "US",
        location: "Austin, TX",
        listingType: "sale",
        minPrice: 300000,
      }),
    ).toContain("realtor.com/realestateandhomes-search/Austin_TX/price-300000-na");
  });

  it("uses ZIP on Realtor sale searches when provided", () => {
    expect(
      realtorAdapter.buildSearchUrl({
        country: "US",
        location: "Oklahoma City, OK",
        listingType: "sale",
        maxPrice: 240000,
        zip: "73103",
      }),
    ).toBe("https://www.realtor.com/realestateandhomes-search/73103/price-na-240000");
  });

  it("puts min and max price in the Realtor path", () => {
    expect(
      realtorAdapter.buildSearchUrl({
        country: "US",
        location: "Durant, OK",
        listingType: "sale",
        minPrice: 90_000,
        maxPrice: 240_000,
        zip: "74701",
      }),
    ).toBe("https://www.realtor.com/realestateandhomes-search/74701/price-90000-240000");
  });

  it("builds FincaRaíz URL", () => {
    expect(
      fincaraizAdapter.buildSearchUrl({
        country: "CO",
        location: "Bogota",
        listingType: "rent",
      }),
    ).toContain("fincaraiz.com.co/arriendo/inmuebles/bogota");
  });

  it("builds MercadoLibre Inmuebles URL for Chile", () => {
    expect(
      mercadolibreInmueblesAdapter.buildSearchUrl({
        country: "CL",
        location: "santiago",
        listingType: "sale",
      }),
    ).toBe(
      `https://inmuebles.mercadolibre.cl/departamentos/venta/santiago/${ML_MIN_PROPERTY_AGE_FILTER}`,
    );
  });

  it("builds MercadoLibre Inmuebles URL for Argentina with filters", () => {
    expect(
      mercadolibreInmueblesAdapter.buildSearchUrl({
        country: "AR",
        location: "capital-federal",
        listingType: "sale",
        minPrice: 500000,
        bedrooms: 3,
      }),
    ).toBe(
      `https://inmuebles.mercadolibre.com.ar/departamentos/venta/3-dormitorios/capital-federal/${ML_MIN_PROPERTY_AGE_FILTER}`,
    );
  });

  it("builds MercadoLibre Inmuebles URL for Peru", () => {
    expect(
      mercadolibreInmueblesAdapter.buildSearchUrl({
        country: "PE",
        location: "lima",
        listingType: "sale",
      }),
    ).toBe(
      `https://inmuebles.mercadolibre.com.pe/departamentos/venta/lima/${ML_MIN_PROPERTY_AGE_FILTER}`,
    );
  });

  it("builds Immobiliare URL", () => {
    expect(
      immobiliareAdapter.buildSearchUrl({
        country: "IT",
        location: "Milano",
        listingType: "rent",
        maxPrice: 1500,
      }),
    ).toBe(
      "https://www.immobiliare.it/affitto-case/milano/?prezzoMassimo=1500",
    );
  });
});

describe("normalizeRawListing", () => {
  it("drops incomplete rows and accepts valid ones", () => {
    const input = {
      country: "MX" as const,
      location: "CDMX",
      listingType: "rent" as const,
    };
    expect(
      normalizeRawListing(
        { title: "Nice flat", url: "/listing/1", price: "12000" },
        input,
        {
          sourceId: "inmuebles24",
          sourceName: "Inmuebles24",
          baseUrl: "https://www.inmuebles24.com",
        },
      ),
    ).toMatchObject({
      title: "Nice flat",
      price: 12000,
      currency: "MXN",
    });

    expect(
      normalizeRawListing(
        { title: "Missing url" },
        input,
        {
          sourceId: "inmuebles24",
          sourceName: "Inmuebles24",
          baseUrl: "https://www.inmuebles24.com",
        },
      ),
    ).toBeNull();
  });

  it("documents MVP listing cap", () => {
    expect(MAX_LISTINGS_PER_SOURCE).toBe(40);
  });
});

describe("normalizeFacebookListing", () => {
  it("parses price, currency, beds/baths from Marketplace card text", async () => {
    const { normalizeFacebookListing } = await import(
      "@/search/adapters/facebook"
    );
    const listing = normalizeFacebookListing(
      {
        url: "https://www.facebook.com/marketplace/item/123",
        text: "$1,500 | 2 bed 1 bath apartment | Austin, TX",
        img: "https://scontent.example/x.jpg",
      },
      { country: "US", location: "Austin, TX", listingType: "rent" },
    );

    expect(listing).not.toBeNull();
    expect(listing!.price).toBe(1500);
    expect(listing!.currency).toBe("USD");
    expect(listing!.bedrooms).toBe(2);
    expect(listing!.bathrooms).toBe(1);
    expect(listing!.url).toBe("https://www.facebook.com/marketplace/item/123");
    expect(listing!.thumbnailUrl).toBe("https://scontent.example/x.jpg");
  });

  it("rejects entries without a valid URL", async () => {
    const { normalizeFacebookListing } = await import(
      "@/search/adapters/facebook"
    );
    expect(
      normalizeFacebookListing(
        { url: "", text: "$100", img: null },
        { country: "MX", location: "Merida", listingType: "sale" },
      ),
    ).toBeNull();
  });
});

describe("normalizeCurrency", () => {
  it("maps portal shorthands to ISO codes", () => {
    expect(normalizeCurrency("MN", "MXN")).toBe("MXN");
    expect(normalizeCurrency("MN$", "MXN")).toBe("MXN");
    expect(normalizeCurrency("$", "USD")).toBe("USD");
    expect(normalizeCurrency("$", "USD", "AR")).toBe("ARS");
    expect(normalizeCurrency("$", "ARS")).toBe("ARS");
    expect(normalizeCurrency("U$S", "USD", "AR")).toBe("USD");
    expect(normalizeCurrency("€", "EUR")).toBe("EUR");
  });

  it("keeps valid ISO codes and falls back otherwise", () => {
    expect(normalizeCurrency("usd", "MXN")).toBe("USD");
    expect(normalizeCurrency("garbage text", "COP")).toBe("COP");
    expect(normalizeCurrency("", "CLP")).toBe("CLP");
    expect(normalizeCurrency(null, "EUR")).toBe("EUR");
  });
});
