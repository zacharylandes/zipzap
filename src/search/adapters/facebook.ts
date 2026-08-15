import type { FacebookRawListing } from "@/facebook/local-browser";
import { normalizeCurrency } from "@/search/adapters/firecrawl-adapter";
import type { AdapterResult, SourceAdapter } from "@/search/adapters/types";
import {
  COUNTRY_CURRENCY,
  MAX_LISTINGS_PER_SOURCE,
  type Listing,
  type SearchInput,
} from "@/search/schema";

const SOURCE_ID = "facebook-marketplace";
const SOURCE_NAME = "Facebook Marketplace";

const PRICE_RE = /(?:([A-Z]{1,3}\$|\$|€|MX\$|MXN|USD|EUR|COP|CLP))\s?([\d.,]+)/i;
const BED_RE = /(\d+)\s*(?:bed|bd|br|rec[aá]mara|habitaci)/i;
const BATH_RE = /(\d+)\s*(?:bath|ba\b|ba\u00f1o)/i;

function parsePrice(text: string): number | null {
  const m = text.match(PRICE_RE);
  if (!m) return null;
  const digits = m[2].replace(/[.,](?=\d{3}\b)/g, "").replace(/,/g, "");
  const n = Number.parseFloat(digits);
  return Number.isFinite(n) ? n : null;
}

function parseCurrencyToken(text: string, fallback: string): string {
  const m = text.match(PRICE_RE);
  return normalizeCurrency(m?.[1] ?? null, fallback);
}

function parseInt1(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

export function normalizeFacebookListing(
  raw: FacebookRawListing,
  input: SearchInput,
): Listing | null {
  if (!raw.url || !/^https?:\/\//.test(raw.url)) return null;
  const text = (raw.text || "").trim();
  const price = parsePrice(text);
  // Title: strip the leading price token, keep the descriptive remainder.
  const title =
    text.replace(PRICE_RE, "").replace(/^[\s|·-]+/, "").split(" | ")[0]?.trim() ||
    "Facebook Marketplace listing";

  return {
    id: `${SOURCE_ID}:${raw.url}`,
    sourceId: SOURCE_ID,
    sourceName: SOURCE_NAME,
    title,
    price,
    currency: parseCurrencyToken(text, COUNTRY_CURRENCY[input.country]),
    bedrooms: parseInt1(text, BED_RE),
    bathrooms: parseInt1(text, BATH_RE),
    area: null,
    areaUnit: null,
    location: input.location || null,
    thumbnailUrl: raw.img,
    url: raw.url,
  };
}

export const facebookAdapter: SourceAdapter = {
  id: SOURCE_ID,
  name: SOURCE_NAME,
  countries: ["MX", "ES", "US", "CO", "CL", "IT"],
  buildSearchUrl: (input) =>
    `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(input.location)}`,
  async search(input: SearchInput): Promise<AdapterResult> {
    if (process.env.HOUSE_SEARCH_ENABLE_FACEBOOK !== "1") {
      return {
        listings: [],
        status: {
          sourceId: SOURCE_ID,
          sourceName: SOURCE_NAME,
          status: "unsupported",
          count: 0,
          message: "Facebook adapter is experimental and disabled",
        },
      };
    }

    try {
      // Lazy import keeps Playwright out of the module graph unless a Facebook
      // search actually runs.
      const { scrapeFacebookMarketplace } = await import(
        "@/facebook/local-browser"
      );
      const { loggedIn, listings: raw } = await scrapeFacebookMarketplace(input);

      const listings: Listing[] = [];
      for (const item of raw) {
        const normalized = normalizeFacebookListing(item, input);
        if (normalized) listings.push(normalized);
        if (listings.length >= MAX_LISTINGS_PER_SOURCE) break;
      }

      if (listings.length === 0) {
        return {
          listings,
          status: {
            sourceId: SOURCE_ID,
            sourceName: SOURCE_NAME,
            status: loggedIn ? "empty" : "error",
            count: 0,
            message: loggedIn
              ? "No Marketplace listings matched"
              : "Not signed in — connect Facebook for results",
          },
        };
      }

      return {
        listings,
        status: {
          sourceId: SOURCE_ID,
          sourceName: SOURCE_NAME,
          status: "ok",
          count: listings.length,
        },
      };
    } catch (error) {
      return {
        listings: [],
        status: {
          sourceId: SOURCE_ID,
          sourceName: SOURCE_NAME,
          status: "error",
          count: 0,
          message: error instanceof Error ? error.message : "Facebook scrape failed",
        },
      };
    }
  },
};
