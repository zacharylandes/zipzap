import { describe, expect, it } from "vitest";
import { fincaraizAdapter } from "@/search/adapters/fincaraiz";
import { idealistaAdapter } from "@/search/adapters/idealista";
import { inmuebles24Adapter } from "@/search/adapters/inmuebles24";
import { portalInmobiliarioAdapter } from "@/search/adapters/portal-inmobiliario";
import { LISTING_LOCATIONS } from "@/search/locations";
import { getSupportedCountries } from "@/search/supported-countries";

describe("LISTING_LOCATIONS", () => {
  it("covers every supported non-US country", () => {
    const supported = getSupportedCountries().filter((code) => code !== "US");
    expect(supported).toEqual(["CL", "CO", "ES", "MX"]);
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
        listingType: "rent",
      }),
    ).toContain(`inmuebles-en-renta-en-${mx.location}.html`);

    const es = LISTING_LOCATIONS.ES[0]!;
    expect(
      idealistaAdapter.buildSearchUrl({
        country: "ES",
        location: es.location,
        listingType: "rent",
      }),
    ).toContain(`idealista.com/alquiler-viviendas/${es.location}/`);

    const co = LISTING_LOCATIONS.CO[0]!;
    expect(
      fincaraizAdapter.buildSearchUrl({
        country: "CO",
        location: co.location,
        listingType: "rent",
      }),
    ).toContain(`fincaraiz.com.co/arriendo/inmuebles/${co.location}`);

    const cl = LISTING_LOCATIONS.CL[0]!;
    expect(
      portalInmobiliarioAdapter.buildSearchUrl({
        country: "CL",
        location: cl.location,
        listingType: "rent",
      }),
    ).toContain(`portalinmobiliario.com/arriendo/departamento/${cl.location}`);
  });
});
