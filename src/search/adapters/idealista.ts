import {
  createPortalAdapter,
  slugifyLocation,
} from "@/search/adapters/firecrawl-adapter";
import type { SearchInput } from "@/search/schema";

function idealistaPlace(location: string): string {
  const slug = slugifyLocation(location);
  // Idealista city pages use city-province slugs (madrid-madrid, barcelona-barcelona).
  if (!slug.includes("-")) {
    return `${slug}-${slug}`;
  }
  return slug;
}

function buildUrl(input: SearchInput): string {
  const place = idealistaPlace(input.location);
  const op = input.listingType === "rent" ? "alquiler-viviendas" : "venta-viviendas";
  const parts: string[] = [];
  if (input.maxPrice != null) parts.push(`precio-hasta_${input.maxPrice}`);
  if (input.minPrice != null) parts.push(`precio-desde_${input.minPrice}`);
  if (input.bedrooms != null) parts.push(`${input.bedrooms}-habitaciones`);
  if (input.minArea != null) parts.push(`metros-cuadrados-mas-de_${input.minArea}`);
  if (input.maxArea != null) parts.push(`metros-cuadrados-menos-de_${input.maxArea}`);
  const filterPath = parts.length ? `con-${parts.join(",")}/` : "";
  return `https://www.idealista.com/${op}/${place}/${filterPath}`;
}

export const idealistaAdapter = createPortalAdapter({
  id: "idealista",
  name: "Idealista",
  countries: ["ES"],
  origin: "https://www.idealista.com",
  buildSearchUrl: buildUrl,
});
