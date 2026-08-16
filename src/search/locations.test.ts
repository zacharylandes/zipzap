import { describe, expect, it } from "vitest";
import { fincaraizAdapter } from "@/search/adapters/fincaraiz";
import { pisosAdapter } from "@/search/adapters/pisos";
import { inmuebles24Adapter } from "@/search/adapters/inmuebles24";
import { mercadolibreInmueblesAdapter } from "@/search/adapters/mercadolibre-inmuebles";
import { LISTING_LOCATIONS } from "@/search/locations";
import { getSupportedCountries } from "@/search/supported-countries";

describe("LISTING_LOCATIONS", () => {
  it("covers every supported non-US country", () => {
    const supported = getSupportedCountries().filter((code) => code !== "US");
    expect(supported).toEqual(["AR", "CL", "CO", "ES", "MX", "PE"]);
    for (const code of supported) {
      expect(LISTING_LOCATIONS[code as keyof typeof LISTING_LOCATIONS].length).toBeGreaterThan(0);
    }
  });

  it("builds portal URLs from curated slugs", () => {
    const mx = LISTING_LOCATIONS.MX[0]!;
    expect(
      inmuebles24Adapter.buildSearchUrl({
        country: "MX",
        location: mx.location,
        listingType: "sale",
      }),
    ).toContain(`inmuebles-en-venta-en-${mx.location}.html`);

    const es = LISTING_LOCATIONS.ES[0]!;
    expect(
      pisosAdapter.buildSearchUrl({
        country: "ES",
        location: es.location,
        listingType: "sale",
      }),
    ).toContain("pisos.com/venta/pisos-madrid/");

    const co = LISTING_LOCATIONS.CO[0]!;
    expect(
      fincaraizAdapter.buildSearchUrl({
        country: "CO",
        location: co.location,
        listingType: "sale",
      }),
    ).toContain(`fincaraiz.com.co/venta/inmuebles/${co.location}`);

    const cl = LISTING_LOCATIONS.CL[0]!;
    expect(
      mercadolibreInmueblesAdapter.buildSearchUrl({
        country: "CL",
        location: cl.location,
        listingType: "sale",
      }),
    ).toContain(`inmuebles.mercadolibre.cl/departamentos/venta/${cl.location}`);

    const ar = LISTING_LOCATIONS.AR[0]!;
    expect(
      mercadolibreInmueblesAdapter.buildSearchUrl({
        country: "AR",
        location: ar.location,
        listingType: "sale",
      }),
    ).toContain(`inmuebles.mercadolibre.com.ar/departamentos/venta/${ar.location}`);
  });
});
