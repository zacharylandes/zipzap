import {
  createPortalAdapter,
  slugifyLocation,
} from "@/search/adapters/firecrawl-adapter";
import type { SearchInput } from "@/search/schema";

function buildUrl(input: SearchInput): string {
  const slug = slugifyLocation(input.location);
  const op = input.listingType === "rent" ? "affitto-case" : "vendita-case";
  const params = new URLSearchParams();
  if (input.minPrice != null) params.set("prezzoMinimo", String(input.minPrice));
  if (input.maxPrice != null) params.set("prezzoMassimo", String(input.maxPrice));
  if (input.bedrooms != null) params.set("localiMinimo", String(input.bedrooms));
  if (input.minArea != null) params.set("superficieMinima", String(input.minArea));
  if (input.maxArea != null) params.set("superficieMassima", String(input.maxArea));
  const qs = params.toString();
  return `https://www.immobiliare.it/${op}/${slug}/${qs ? `?${qs}` : ""}`;
}

export const immobiliareAdapter = createPortalAdapter({
  id: "immobiliare",
  name: "Immobiliare.it",
  countries: ["IT"],
  origin: "https://www.immobiliare.it",
  buildSearchUrl: buildUrl,
});
