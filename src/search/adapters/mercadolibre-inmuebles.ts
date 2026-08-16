import {
  createPortalAdapter,
  slugifyLocation,
} from "@/search/adapters/firecrawl-adapter";
import type { SearchInput } from "@/search/schema";

type MercadoLibreCountry = "AR" | "CL" | "PE";

const ML_SITES: Record<
  MercadoLibreCountry,
  { host: string; rentOp: string; saleOp: string }
> = {
  AR: {
    host: "inmuebles.mercadolibre.com.ar",
    rentOp: "alquiler",
    saleOp: "venta",
  },
  CL: {
    host: "inmuebles.mercadolibre.cl",
    rentOp: "arriendo",
    saleOp: "venta",
  },
  PE: {
    host: "inmuebles.mercadolibre.com.pe",
    rentOp: "alquiler",
    saleOp: "venta",
  },
};

function mercadoLibreCountry(input: SearchInput): MercadoLibreCountry {
  return input.country as MercadoLibreCountry;
}

export function mercadoLibreInmueblesOrigin(input: SearchInput): string {
  const site = ML_SITES[mercadoLibreCountry(input)];
  return `https://${site.host}`;
}

function buildFilterSegments(input: SearchInput): string {
  const segments: string[] = [];

  if (input.minPrice != null && input.maxPrice != null) {
    segments.push(`_PriceRange_${input.minPrice}-${input.maxPrice}`);
  } else if (input.maxPrice != null) {
    segments.push(`_PriceRange_-${input.maxPrice}`);
  } else if (input.minPrice != null) {
    segments.push(`_PriceRange_${input.minPrice}-`);
  }

  if (input.bedrooms != null) {
    segments.push(`_Bedrooms_${input.bedrooms}`);
  }

  return segments.join("");
}

export function buildMercadoLibreInmueblesUrl(input: SearchInput): string {
  const site = ML_SITES[mercadoLibreCountry(input)];
  const slug = slugifyLocation(input.location);
  const op = input.listingType === "rent" ? site.rentOp : site.saleOp;
  const filters = buildFilterSegments(input);
  return `https://${site.host}/departamentos/${op}/${slug}${filters}`;
}

export const mercadolibreInmueblesAdapter = createPortalAdapter({
  id: "mercadolibre-inmuebles",
  name: "MercadoLibre Inmuebles",
  countries: ["AR", "CL", "PE"],
  origin: mercadoLibreInmueblesOrigin,
  buildSearchUrl: buildMercadoLibreInmueblesUrl,
});
