import { getCached, setCached } from "@/search/cache";
import { dedupeListings } from "@/search/dedupe";
import { filterListingsBySearchInput } from "@/search/filters";
import { getAdaptersForCountry } from "@/search/registry";
import { applyLocalCurrency, numbeoRentInLocalCurrency } from "@/markets/listing-fx";
import { enrichListings, enrichListingsWithNumbeo } from "@/markets/enrich";
import { findMarketByZip, loadMarketsFile } from "@/markets/load";
import { findNumbeoRent } from "@/markets/numbeo";
import {
  COUNTRY_CURRENCY,
  SOURCE_TIMEOUT_MS,
  type Listing,
  type SearchInput,
  type SearchResponse,
  type SourceStatus,
} from "@/search/schema";

function normalizeCacheKey(input: SearchInput): string {
  return JSON.stringify({
    country: input.country,
    location: input.location.trim().toLowerCase(),
    listingType: input.listingType,
    minPrice: input.minPrice ?? null,
    maxPrice: input.maxPrice ?? null,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    minArea: input.minArea ?? null,
    maxArea: input.maxArea ?? null,
    zip: input.zip ?? null,
  });
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function finalizeResponse(input: SearchInput, response: SearchResponse): SearchResponse {
  const listings = filterListingsBySearchInput(response.listings, input);
  return { ...response, listings };
}

export async function runSearch(input: SearchInput): Promise<SearchResponse> {
  const key = normalizeCacheKey(input);
  const cached = getCached(key);
  if (cached) return finalizeResponse(input, cached);

  const adapters = getAdaptersForCountry(input.country);
  if (adapters.length === 0) {
    return {
      listings: [],
      sources: [],
      cached: false,
      currency: COUNTRY_CURRENCY[input.country],
      country: input.country,
    };
  }

  const settled = await Promise.allSettled(
    adapters.map((adapter) =>
      withTimeout(adapter.search(input), SOURCE_TIMEOUT_MS, adapter.name),
    ),
  );

  const listings: Listing[] = [];
  const sources: SourceStatus[] = [];

  settled.forEach((result, index) => {
    const adapter = adapters[index]!;
    if (result.status === "fulfilled") {
      listings.push(...result.value.listings);
      sources.push(result.value.status);
      return;
    }

    sources.push({
      sourceId: adapter.id,
      sourceName: adapter.name,
      status: "error",
      count: 0,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : "Source failed",
    });
  });

  let market;
  try {
    market =
      input.country === "US" && input.zip
        ? findMarketByZip(loadMarketsFile().markets, input.zip)
        : undefined;
  } catch {
    market = undefined;
  }
  let enriched = enrichListings(dedupeListings(listings), market);
  if (input.country !== "US") {
    const localCurrency = COUNTRY_CURRENCY[input.country];
    enriched = await applyLocalCurrency(enriched, localCurrency);
    const numbeoEntry = findNumbeoRent(input.location.trim().toLowerCase());
    const monthlyRent = await numbeoRentInLocalCurrency(numbeoEntry, localCurrency);
    enriched = enrichListingsWithNumbeo(enriched, monthlyRent);
  }

  const response: SearchResponse = finalizeResponse(input, {
    listings: enriched,
    sources,
    cached: false,
    currency: COUNTRY_CURRENCY[input.country],
    country: input.country,
  });

  setCached(key, response);
  return response;
}
