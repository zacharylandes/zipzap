import { z } from "zod";
import { getFirecrawlClient } from "@/firecrawl/client";
import {
  COUNTRY_CURRENCY,
  MAX_LISTINGS_PER_SOURCE,
  SEARCH_CACHE_TTL_MS,
  type Listing,
  type SearchInput,
} from "@/search/schema";
import type {
  AdapterResult,
  RawListing,
  SourceAdapter,
} from "@/search/adapters/types";

const extractedSchema = z.object({
  listings: z
    .array(
      z.object({
        title: z.string().nullable().optional(),
        price: z.union([z.number(), z.string()]).nullable().optional(),
        currency: z.string().nullable().optional(),
        bedrooms: z.union([z.number(), z.string()]).nullable().optional(),
        bathrooms: z.union([z.number(), z.string()]).nullable().optional(),
        area: z.union([z.number(), z.string()]).nullable().optional(),
        areaUnit: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        thumbnailUrl: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        url: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

export function slugifyLocation(location: string): string {
  return location
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const CURRENCY_ALIASES: Record<string, string> = {
  MN: "MXN",
  "MN$": "MXN",
  "MXN$": "MXN",
  MX$: "MXN",
  "$": "USD",
  US$: "USD",
  USD$: "USD",
  "€": "EUR",
  EU: "EUR",
  COP$: "COP",
  "COL$": "COP",
  CLP$: "CLP",
  "CL$": "CLP",
};

export function normalizeCurrency(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return fallback;
  if (CURRENCY_ALIASES[trimmed]) return CURRENCY_ALIASES[trimmed];
  // Only trust clean 3-letter ISO codes from scraped text; otherwise use the
  // country's known currency so display stays correct.
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return fallback;
}

export function absoluteUrl(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

export function normalizeRawListing(
  raw: RawListing,
  input: SearchInput,
  meta: { sourceId: string; sourceName: string; baseUrl: string },
): Listing | null {
  const url = absoluteUrl(raw.url, meta.baseUrl);
  const title = raw.title?.trim();
  if (!url || !title) return null;

  const thumbnail =
    absoluteUrl(raw.thumbnailUrl, meta.baseUrl) ??
    absoluteUrl(raw.imageUrl, meta.baseUrl);

  const areaUnitRaw = raw.areaUnit?.toLowerCase() ?? "";
  const areaUnit =
    areaUnitRaw.includes("ft") || areaUnitRaw.includes("sqft")
      ? ("sqft" as const)
      : areaUnitRaw.includes("m")
        ? ("sqm" as const)
        : input.country === "US"
          ? ("sqft" as const)
          : ("sqm" as const);

  return {
    id: `${meta.sourceId}:${url}`,
    sourceId: meta.sourceId,
    sourceName: meta.sourceName,
    title,
    price: parseNumber(raw.price),
    currency: normalizeCurrency(raw.currency, COUNTRY_CURRENCY[input.country]),
    bedrooms: parseNumber(raw.bedrooms),
    bathrooms: parseNumber(raw.bathrooms),
    area: parseNumber(raw.area),
    areaUnit: parseNumber(raw.area) == null ? null : areaUnit,
    location: (raw.location || raw.address || input.location || null)?.toString() ?? null,
    thumbnailUrl: thumbnail,
    url,
  };
}

export type PortalAdapterConfig = {
  id: string;
  name: string;
  countries: SearchInput["country"][];
  origin: string;
  buildSearchUrl: (input: SearchInput) => string;
};

export function createPortalAdapter(config: PortalAdapterConfig): SourceAdapter {
  return {
    id: config.id,
    name: config.name,
    countries: config.countries,
    buildSearchUrl: config.buildSearchUrl,
    async search(input: SearchInput): Promise<AdapterResult> {
      if (!config.countries.includes(input.country)) {
        return {
          listings: [],
          status: {
            sourceId: config.id,
            sourceName: config.name,
            status: "unsupported",
            message: `Not available for ${input.country}`,
            count: 0,
          },
        };
      }

      const searchUrl = config.buildSearchUrl(input);

      try {
        const client = getFirecrawlClient();
        const result = (await client.scrape(searchUrl, {
          formats: [
            {
              type: "json",
              schema: z.toJSONSchema(extractedSchema),
              prompt:
                "Extract up to 40 property listings from this search results page. For each listing include title, price (number), currency, bedrooms, bathrooms, area, areaUnit, location/address, thumbnail/image URL, and the listing detail URL.",
            },
          ],
          onlyMainContent: true,
          waitFor: 3000,
          proxy: "auto",
          // Reuse Firecrawl's recent cached fetch when available: faster,
          // cheaper, and far more reliable against bot-protected portals.
          maxAge: SEARCH_CACHE_TTL_MS,
          // Bound the scrape. LLM extract is often 20–45s; fail instead of
          // retrying for minutes across keys.
          timeout: 60_000,
        })) as { json?: unknown };

        const parsed = extractedSchema.safeParse(result?.json ?? { listings: [] });
        const rawListings = parsed.success ? parsed.data.listings : [];

        const listings: Listing[] = [];
        for (const raw of rawListings) {
          const normalized = normalizeRawListing(raw, input, {
            sourceId: config.id,
            sourceName: config.name,
            baseUrl: config.origin,
          });
          if (normalized) listings.push(normalized);
          if (listings.length >= MAX_LISTINGS_PER_SOURCE) break;
        }

        return {
          listings,
          status: {
            sourceId: config.id,
            sourceName: config.name,
            status: listings.length > 0 ? "ok" : "empty",
            count: listings.length,
            message:
              listings.length === 0
                ? "No listings extracted from the result page"
                : undefined,
          },
        };
      } catch (error) {
        return {
          listings: [],
          status: {
            sourceId: config.id,
            sourceName: config.name,
            status: "error",
            count: 0,
            message:
              error instanceof Error
                ? error.message
                : "Failed to scrape listings",
          },
        };
      }
    },
  };
}
