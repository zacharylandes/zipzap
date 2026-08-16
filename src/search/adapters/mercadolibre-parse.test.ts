import { describe, expect, it } from "vitest";
import {
  extractMercadoLibreThumbnail,
  parseLocalizedNumber,
  parseMercadoLibreHtml,
  parseMercadoLibrePriceLabel,
} from "@/search/adapters/mercadolibre-parse";

const SAMPLE_CARD = `
<li class="ui-search-layout__item">
  <img class="poly-component__picture" src="https://http2.mlstatic.com/photo.webp" alt="Edificio - Palermo" />
  <a href="https://departamento.mercadolibre.com.ar/MLA-3700630222-edificio-palermo-_JM" class="poly-component__link">
    <h2 class="poly-component__title">Edificio - Palermo</h2>
  </a>
  <span aria-label="826800 dólares" aria-roledescription="Monto"></span>
  <span>3 dorm · 120 m²</span>
</li>
`;

describe("extractMercadoLibreThumbnail", () => {
  it("prefers the listing photo over broker logos", () => {
    const card = `
      <img class="poly-component__picture" src="https://http2.mlstatic.com/D_NQ_NP_2X_755046-property.webp" alt="Edificio" />
      <img class="poly-component__picture" src="https://http2.mlstatic.com/storage/vis-accounts/broker.png" alt="Broker" />
    `;
    expect(extractMercadoLibreThumbnail(card)).toBe(
      "https://http2.mlstatic.com/D_NQ_NP_2X_755046-property.webp",
    );
  });
});

describe("parseMercadoLibrePriceLabel", () => {
  it("detects USD prices in Argentina", () => {
    expect(parseMercadoLibrePriceLabel("826800 dólares", "AR")).toEqual({
      price: 826800,
      currency: "USD",
    });
  });

  it("parses dotted peso amounts as ARS even when Argentina displays USD", () => {
    expect(parseMercadoLibrePriceLabel("150.000.000 pesos", "AR")).toEqual({
      price: 150_000_000,
      currency: "ARS",
    });
  });
});

describe("parseLocalizedNumber", () => {
  it("handles Latin thousands separators", () => {
    expect(parseLocalizedNumber("150.000.000")).toBe(150_000_000);
    expect(parseLocalizedNumber("826800")).toBe(826800);
  });
});

describe("parseMercadoLibreHtml", () => {
  it("extracts listing cards from search HTML", () => {
    const listings = parseMercadoLibreHtml(
      `<ul>${SAMPLE_CARD}</ul>`,
      {
        country: "AR",
        location: "capital-federal",
        listingType: "sale",
        bedrooms: 3,
      },
    );

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      title: "Edificio - Palermo",
      price: 826800,
      currency: "USD",
      bedrooms: 3,
      area: 120,
      thumbnailUrl: "https://http2.mlstatic.com/photo.webp",
      url: "https://departamento.mercadolibre.com.ar/MLA-3700630222-edificio-palermo-_JM",
    });
  });
});
