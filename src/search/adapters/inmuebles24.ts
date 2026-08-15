import {
  createPortalAdapter,
  slugifyLocation,
} from "@/search/adapters/firecrawl-adapter";
import type { SearchInput } from "@/search/schema";

function buildUrl(input: SearchInput): string {
  const slug = slugifyLocation(input.location);
  const op = input.listingType === "rent" ? "en-renta" : "en-venta";
  const params = new URLSearchParams();
  if (input.minPrice != null) params.set("precio-desde", String(input.minPrice));
  if (input.maxPrice != null) params.set("precio-hasta", String(input.maxPrice));
  if (input.bedrooms != null) params.set("recamaras", String(input.bedrooms));
  if (input.bathrooms != null) params.set("banos", String(input.bathrooms));
  if (input.minArea != null) params.set("metros-cuadrados-desde", String(input.minArea));
  if (input.maxArea != null) params.set("metros-cuadrados-hasta", String(input.maxArea));
  const qs = params.toString();
  return `https://www.inmuebles24.com/inmuebles-${op}-en-${slug}.html${qs ? `?${qs}` : ""}`;
}

export const inmuebles24Adapter = createPortalAdapter({
  id: "inmuebles24",
  name: "Inmuebles24",
  countries: ["MX"],
  origin: "https://www.inmuebles24.com",
  buildSearchUrl: buildUrl,
});
