import {
  createPortalAdapter,
  slugifyLocation,
} from "@/search/adapters/firecrawl-adapter";
import type { SearchInput } from "@/search/schema";

function buildUrl(input: SearchInput): string {
  const slug = slugifyLocation(input.location);
  const op = input.listingType === "rent" ? "arriendo" : "venta";
  const params = new URLSearchParams();
  if (input.minPrice != null) params.set("PriceRange_BEGIN", String(input.minPrice));
  if (input.maxPrice != null) params.set("PriceRange_END", String(input.maxPrice));
  if (input.bedrooms != null) params.set("BEDROOMS", String(input.bedrooms));
  if (input.bathrooms != null) params.set("FULLBATHS", String(input.bathrooms));
  if (input.minArea != null) params.set("COVEREDAREA_FROM", String(input.minArea));
  if (input.maxArea != null) params.set("COVEREDAREA_TO", String(input.maxArea));
  const qs = params.toString();
  return `https://www.portalinmobiliario.com/${op}/departamento/${slug}${qs ? `?${qs}` : ""}`;
}

export const portalInmobiliarioAdapter = createPortalAdapter({
  id: "portal-inmobiliario",
  name: "Portal Inmobiliario",
  countries: ["CL"],
  origin: "https://www.portalinmobiliario.com",
  buildSearchUrl: buildUrl,
});
