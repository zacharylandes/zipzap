import {
  createPortalAdapter,
  slugifyLocation,
} from "@/search/adapters/firecrawl-adapter";
import type { SearchInput } from "@/search/schema";

function realtorSlug(location: string): string {
  return location
    .trim()
    .replace(/,\s*/g, "_")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "");
}

function rangeSegment(prefix: string, min?: number, max?: number): string | null {
  if (min == null && max == null) return null;
  const lo = min != null ? String(min) : "na";
  const hi = max != null ? String(max) : "na";
  return `${prefix}-${lo}-${hi}`;
}

function buildUrl(input: SearchInput): string {
  const slug =
    input.zip && /^\d{5}$/.test(input.zip)
      ? input.zip
      : realtorSlug(input.location) || slugifyLocation(input.location);
  const base =
    input.listingType === "rent"
      ? `https://www.realtor.com/apartments/${slug}`
      : `https://www.realtor.com/realestateandhomes-search/${slug}`;

  const segments: string[] = [];
  const price = rangeSegment("price", input.minPrice, input.maxPrice);
  if (price) segments.push(price);
  if (input.bedrooms != null) segments.push(`beds-${input.bedrooms}`);
  if (input.bathrooms != null) segments.push(`baths-${input.bathrooms}`);
  const sqft = rangeSegment("sqft", input.minArea, input.maxArea);
  if (sqft) segments.push(sqft);

  return segments.length > 0 ? `${base}/${segments.join("/")}` : base;
}

export const realtorAdapter = createPortalAdapter({
  id: "realtor",
  name: "Realtor.com",
  countries: ["US"],
  origin: "https://www.realtor.com",
  buildSearchUrl: buildUrl,
});
