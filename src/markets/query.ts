import type { MarketsFile } from "@/markets/file";
import {
  DEFAULT_MAX_PRICE,
  DEFAULT_MIN_PRICE,
  DEFAULT_MARKET_SORT,
  filterAndRank,
  type CrimeFilter,
  type MarketSort,
  type RankOptions,
} from "@/markets/rank";
import type { ListingSort } from "@/markets/enrich";
import {
  parseCountryCode,
  supportedCountryOptions,
} from "@/search/supported-countries";
import type { CountryCode } from "@/search/schema";

export type MarketQuery = Omit<RankOptions, "nationalCrimeRate"> & {
  country?: CountryCode;
};

export { parseCountryCode, supportedCountryOptions };

const CRIME_FILTERS: CrimeFilter[] = ["averageOrBetter", "excludeHigh"];
const MARKET_SORTS: MarketSort[] = [
  "priceDesc",
  "priceAsc",
  "rentDesc",
  "rentAsc",
  "yieldDesc",
  "yieldAsc",
];

function optionalPositive(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function searchParamsFromRecord(
  raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const scalar = Array.isArray(value) ? value[0] : value;
    if (scalar) params.set(key, scalar);
  }
  return params;
}

export function parseMarketSort(raw: string | null): MarketSort {
  if (raw === "yield") return "yieldDesc";
  if (raw && MARKET_SORTS.includes(raw as MarketSort)) return raw as MarketSort;
  return DEFAULT_MARKET_SORT;
}

export function toListingSort(sort: MarketSort): ListingSort {
  if (sort === "yieldDesc" || sort === "yieldAsc") return "yield";
  return sort;
}


export function serializeMarketQuery(query: MarketQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.country && query.country !== "US") params.set("country", query.country);
  params.set("minPrice", String(query.minPrice ?? DEFAULT_MIN_PRICE));
  params.set("maxPrice", String(query.maxPrice ?? DEFAULT_MAX_PRICE));
  params.set("crimeFilter", query.crimeFilter ?? "averageOrBetter");
  if (query.state) params.set("state", query.state);
  if (query.sort && query.sort !== DEFAULT_MARKET_SORT) params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params;
}

export function zipListingsHref(zip: string, query: MarketQuery): string {
  return `/zips/${zip}?${serializeMarketQuery(query)}`;
}

export function homeHref(query: MarketQuery): string {
  return `/?${serializeMarketQuery(query)}`;
}

export function parseMarketQuery(params: URLSearchParams): MarketQuery {
  const crimeFilterRaw = params.get("crimeFilter");
  const crimeFilter = CRIME_FILTERS.includes(crimeFilterRaw as CrimeFilter)
    ? (crimeFilterRaw as CrimeFilter)
    : "averageOrBetter";
  const stateRaw = params.get("state")?.trim();
  return {
    country: parseCountryCode(params.get("country")),
    minPrice: optionalPositive(params.get("minPrice")) ?? DEFAULT_MIN_PRICE,
    maxPrice: optionalPositive(params.get("maxPrice")) ?? DEFAULT_MAX_PRICE,
    crimeFilter,
    state: stateRaw ? stateRaw.toUpperCase() : undefined,
    minPopulation: optionalPositive(params.get("minPopulation")) ?? 0,
    sort: parseMarketSort(params.get("sort")),
    page: Math.max(1, optionalPositive(params.get("page")) ?? 1),
  };
}

export function buildMarketsResponse(file: MarketsFile, params: URLSearchParams) {
  const query = parseMarketQuery(params);
  const markets = filterAndRank(file.markets, {
    ...query,
    nationalCrimeRate: file.nationalCrimeRate,
  });
  const states = [...new Set(file.markets.map((row) => row.state))]
    .filter(Boolean)
    .sort();
  return {
    generatedAt: file.generatedAt,
    nationalCrimeRate: file.nationalCrimeRate,
    total: markets.length,
    states,
    markets,
  };
}
