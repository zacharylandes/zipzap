import { z } from "zod";
import { getFirecrawlClient } from "@/firecrawl/client";
import {
  normalizeRawListing,
  slugifyLocation,
} from "@/search/adapters/firecrawl-adapter";
import { fetchMercadoLibreSearchHtml } from "@/search/adapters/mercadolibre-fetch";
import { parseMercadoLibreHtml } from "@/search/adapters/mercadolibre-parse";
import type { AdapterResult, SourceAdapter } from "@/search/adapters/types";
import {
  MAX_LISTINGS_PER_SOURCE,
  SEARCH_CACHE_TTL_MS,
  type Listing,
  type SearchInput,
} from "@/search/schema";

type MercadoLibreCountry = "AR" | "CL" | "PE";

const ML_SITES: Record<
  MercadoLibreCountry,
  { host: string; rentOp: string; saleOp: string; useDormitoriosPath: boolean }
> = {
  AR: {
    host: "inmuebles.mercadolibre.com.ar",
    rentOp: "alquiler",
    saleOp: "venta",
    useDormitoriosPath: true,
  },
  CL: {
    host: "inmuebles.mercadolibre.cl",
    rentOp: "arriendo",
    saleOp: "venta",
    useDormitoriosPath: false,
  },
  PE: {
    host: "inmuebles.mercadolibre.com.pe",
    rentOp: "alquiler",
    saleOp: "venta",
    useDormitoriosPath: true,
  },
};

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

function mercadoLibreCountry(input: SearchInput): MercadoLibreCountry {
  return input.country as MercadoLibreCountry;
}

export function mercadoLibreInmueblesOrigin(input: SearchInput): string {
  const site = ML_SITES[mercadoLibreCountry(input)];
  return `https://${site.host}`;
}

function buildFilterSegments(input: SearchInput, includePrice: boolean): string {
  const segments: string[] = [];

  if (includePrice) {
    if (input.minPrice != null && input.maxPrice != null) {
      segments.push(`_PriceRange_${input.minPrice}-${input.maxPrice}`);
    } else if (input.maxPrice != null) {
      segments.push(`_PriceRange_-${input.maxPrice}`);
    } else if (input.minPrice != null) {
      segments.push(`_PriceRange_${input.minPrice}-`);
    }
  }

  if (input.bedrooms != null && !ML_SITES[mercadoLibreCountry(input)].useDormitoriosPath) {
    segments.push(`_Bedrooms_${input.bedrooms}`);
  }

  return segments.join("");
}

export function buildMercadoLibreInmueblesUrl(input: SearchInput): string {
  const country = mercadoLibreCountry(input);
  const site = ML_SITES[country];
  const slug = slugifyLocation(input.location);
  const op = input.listingType === "rent" ? site.rentOp : site.saleOp;
  const includePrice = country !== "AR";
  const filters = buildFilterSegments(input, includePrice);

  const parts = [`https://${site.host}/departamentos`, op];
  if (site.useDormitoriosPath && input.bedrooms != null) {
    parts.push(`${input.bedrooms}-dormitorios`);
  }
  parts.push(slug);

  let url = `${parts.join("/")}/`;
  if (filters) url += filters;
  return url;
}

async function scrapeHtml(url: string): Promise<string> {
  return fetchMercadoLibreSearchHtml(url);
}

async function scrapeJsonFallback(
  url: string,
): Promise<z.infer<typeof extractedSchema>["listings"]> {
  const client = getFirecrawlClient();
  const result = (await client.scrape(url, {
    formats: [
      {
        type: "json",
        schema: z.toJSONSchema(extractedSchema),
        prompt:
          "Extract up to 40 property listings from this MercadoLibre Inmuebles search page. Include title, numeric price, currency (USD or local peso code when shown), bedrooms, bathrooms, area in m², location, image URL, and listing URL.",
      },
    ],
    onlyMainContent: false,
    waitFor: 5000,
    proxy: "auto",
    maxAge: SEARCH_CACHE_TTL_MS,
    timeout: 60_000,
  })) as { json?: unknown };

  const parsed = extractedSchema.safeParse(result?.json ?? { listings: [] });
  return parsed.success ? parsed.data.listings : [];
}

export const mercadolibreInmueblesAdapter: SourceAdapter = {
  id: "mercadolibre-inmuebles",
  name: "MercadoLibre Inmuebles",
  countries: ["AR", "CL", "PE"],
  buildSearchUrl: buildMercadoLibreInmueblesUrl,
  async search(input: SearchInput): Promise<AdapterResult> {
    if (!mercadolibreInmueblesAdapter.countries.includes(input.country)) {
      return {
        listings: [],
        status: {
          sourceId: mercadolibreInmueblesAdapter.id,
          sourceName: mercadolibreInmueblesAdapter.name,
          status: "unsupported",
          message: `Not available for ${input.country}`,
          count: 0,
        },
      };
    }

    const searchUrl = buildMercadoLibreInmueblesUrl(input);
    const origin = mercadoLibreInmueblesOrigin(input);
    const meta = {
      sourceId: mercadolibreInmueblesAdapter.id,
      sourceName: mercadolibreInmueblesAdapter.name,
      baseUrl: origin,
    };

    try {
      const html = await scrapeHtml(searchUrl);
      let rawListings = parseMercadoLibreHtml(html, input);

      if (rawListings.length === 0) {
        rawListings = await scrapeJsonFallback(searchUrl);
      }

      const listings: Listing[] = [];
      for (const raw of rawListings) {
        const normalized = normalizeRawListing(raw, input, meta);
        if (normalized) listings.push(normalized);
        if (listings.length >= MAX_LISTINGS_PER_SOURCE) break;
      }

      return {
        listings,
        status: {
          sourceId: meta.sourceId,
          sourceName: meta.sourceName,
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
