import { normalizeRawListing } from "@/search/adapters/firecrawl-adapter";
import {
  fetchRedfinGisListings,
  fetchRedfinSearchHtml,
} from "@/search/adapters/redfin-fetch";
import {
  parseRedfinHtml,
  redfinHtmlLooksBlocked,
} from "@/search/adapters/redfin-parse";
import type { AdapterResult, RawListing, SourceAdapter } from "@/search/adapters/types";
import { MAX_LISTINGS_PER_SOURCE, type Listing, type SearchInput } from "@/search/schema";

const ORIGIN = "https://www.redfin.com";

function priceToken(value: number): string {
  if (value >= 1000 && value % 1000 === 0) return `${value / 1000}k`;
  return String(value);
}

export function buildRedfinSearchUrl(input: SearchInput): string {
  const zip =
    input.zip && /^\d{5}$/.test(input.zip)
      ? input.zip
      : /^\d{5}$/.test(input.location.trim())
        ? input.location.trim()
        : null;
  if (!zip) {
    throw new Error("Redfin US search needs a 5-digit ZIP");
  }

  const filters: string[] = [];
  if (input.minPrice != null) filters.push(`min-price=${priceToken(input.minPrice)}`);
  if (input.maxPrice != null) filters.push(`max-price=${priceToken(input.maxPrice)}`);
  if (input.bedrooms != null) filters.push(`min-beds=${input.bedrooms}`);
  if (input.bathrooms != null) filters.push(`min-baths=${input.bathrooms}`);
  if (input.minArea != null) filters.push(`min-sqft=${Math.round(input.minArea)}`);
  if (input.maxArea != null) filters.push(`max-sqft=${Math.round(input.maxArea)}`);

  const base = `${ORIGIN}/zipcode/${zip}`;
  return filters.length > 0 ? `${base}/filter/${filters.join(",")}` : base;
}

export const redfinAdapter: SourceAdapter = {
  id: "redfin",
  name: "Redfin",
  countries: ["US"],
  buildSearchUrl: buildRedfinSearchUrl,
  async search(input: SearchInput): Promise<AdapterResult> {
    if (!redfinAdapter.countries.includes(input.country)) {
      return {
        listings: [],
        status: {
          sourceId: redfinAdapter.id,
          sourceName: redfinAdapter.name,
          status: "unsupported",
          message: `Not available for ${input.country}`,
          count: 0,
        },
      };
    }

    let searchUrl: string;
    try {
      searchUrl = buildRedfinSearchUrl(input);
    } catch (error) {
      return {
        listings: [],
        status: {
          sourceId: redfinAdapter.id,
          sourceName: redfinAdapter.name,
          status: "error",
          count: 0,
          message: error instanceof Error ? error.message : "Invalid Redfin search",
        },
      };
    }

    const meta = {
      sourceId: redfinAdapter.id,
      sourceName: redfinAdapter.name,
      baseUrl: ORIGIN,
    };

    const toListings = (rawListings: RawListing[]): Listing[] => {
      const listings: Listing[] = [];
      for (const raw of rawListings) {
        const normalized = normalizeRawListing(raw, input, meta);
        if (normalized) listings.push(normalized);
        if (listings.length >= MAX_LISTINGS_PER_SOURCE) break;
      }
      return listings;
    };

    if (input.listingType === "sale") {
      try {
        const gisListings = toListings(await fetchRedfinGisListings(input));
        if (gisListings.length > 0) {
          return {
            listings: gisListings,
            status: {
              sourceId: meta.sourceId,
              sourceName: meta.sourceName,
              status: "ok",
              count: gisListings.length,
            },
          };
        }
      } catch {
        // GIS is best-effort; ZIP HTML + Firecrawl remain as fallback.
      }
    }

    try {
      const html = await fetchRedfinSearchHtml(searchUrl);
      const listings = toListings(parseRedfinHtml(html, input));

      return {
        listings,
        status: {
          sourceId: meta.sourceId,
          sourceName: meta.sourceName,
          status: listings.length > 0 ? "ok" : "empty",
          count: listings.length,
          message:
            listings.length === 0
              ? redfinHtmlLooksBlocked(html)
                ? "Redfin blocked the listing fetch"
                : "No listings extracted from the result page"
              : undefined,
        },
      };
    } catch (error) {
      return {
        listings: [],
        status: {
          sourceId: meta.sourceId,
          sourceName: meta.sourceName,
          status: "error",
          count: 0,
          message:
            error instanceof Error ? error.message : "Failed to scrape listings",
        },
      };
    }
  },
};
