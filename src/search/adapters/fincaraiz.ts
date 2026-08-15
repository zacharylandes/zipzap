import {
  createPortalAdapter,
  slugifyLocation,
} from "@/search/adapters/firecrawl-adapter";
import type { SearchInput } from "@/search/schema";

function buildUrl(input: SearchInput): string {
  const slug = slugifyLocation(input.location);
  const op = input.listingType === "rent" ? "arriendo" : "venta";
  const params = new URLSearchParams();
  if (input.minPrice != null) params.set("precio_desde", String(input.minPrice));
  if (input.maxPrice != null) params.set("precio_hasta", String(input.maxPrice));
  if (input.bedrooms != null) params.set("habitaciones", String(input.bedrooms));
  if (input.bathrooms != null) params.set("banos", String(input.bathrooms));
  if (input.minArea != null) params.set("area_desde", String(input.minArea));
  if (input.maxArea != null) params.set("area_hasta", String(input.maxArea));
  const qs = params.toString();
  return `https://www.fincaraiz.com.co/${op}/inmuebles/${slug}${qs ? `?${qs}` : ""}`;
}

export const fincaraizAdapter = createPortalAdapter({
  id: "fincaraiz",
  name: "FincaRaíz",
  countries: ["CO"],
  origin: "https://www.fincaraiz.com.co",
  buildSearchUrl: buildUrl,
});
