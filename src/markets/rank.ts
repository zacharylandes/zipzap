import { insuranceRateForState, propertyTaxRateForState } from "@/calc/state-costs";
import {
  UNDERWRITING_DEFAULTS,
  underwrite,
  type UnderwritingAssumptions,
  type UnderwritingResult,
} from "@/calc/underwriting";

export const DEFAULT_MIN_PRICE = 90_000;
export const DEFAULT_MAX_PRICE = 240_000;
export const DEFAULT_MIN_POPULATION = 5_000;

export type CrimeFilter = "averageOrBetter" | "excludeHigh" | "all";
export type MarketSort =
  | "priceDesc"
  | "priceAsc"
  | "rentDesc"
  | "rentAsc"
  | "yieldDesc"
  | "yieldAsc"
  | "dscrDesc"
  | "dscrAsc"
  | "dscrMarginDesc"
  | "dscrMarginAsc"
  | "priceGapDesc"
  | "priceGapAsc"
  | "noiDesc"
  | "noiAsc";

export type MarketSortColumn =
  | "yield"
  | "price"
  | "rent"
  | "dscr"
  | "dscrMargin"
  | "priceGap"
  | "noi";

export const DEFAULT_MARKET_SORT: MarketSort = "yieldDesc";
export const MARKETS_PAGE_SIZE = 25;

export const MARKET_SORT_LABELS: Record<MarketSort, string> = {
  priceDesc: "Price: high to low",
  priceAsc: "Price: low to high",
  rentDesc: "Rent: high to low",
  rentAsc: "Rent: low to high",
  yieldDesc: "Yield: high to low",
  yieldAsc: "Yield: low to high",
  dscrDesc: "DSCR: high to low",
  dscrAsc: "DSCR: low to high",
  dscrMarginDesc: "DSCR margin: high to low",
  dscrMarginAsc: "DSCR margin: low to high",
  priceGapDesc: "DSCR-supported discount: high to low",
  priceGapAsc: "DSCR-supported discount: low to high",
  noiDesc: "NOI: high to low",
  noiAsc: "NOI: low to high",
};

export type MarketRow = {
  zip: string;
  city: string;
  state: string;
  county: string;
  zhvi: number;
  zori: number;
  propertyTaxRate?: number;
  grossYield: number;
  crimeRate: number;
  crimeVsNational: number;
  population: number | null;
};

export type RankOptions = {
  minPrice?: number;
  maxPrice?: number;
  crimeFilter?: CrimeFilter;
  state?: string;
  city?: string;
  minPopulation?: number;
  sort?: MarketSort;
  page?: number;
  nationalCrimeRate: number;
};

function normalizePlace(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function marketCityMatches(city: string, state: string, query: string): boolean {
  const needle = normalizePlace(query);
  if (!needle) return true;

  const hayCity = normalizePlace(city);
  const hayState = normalizePlace(state);

  const comma = needle.lastIndexOf(",");
  if (comma >= 0) {
    const cityQuery = normalizePlace(needle.slice(0, comma));
    const stateQuery = normalizePlace(needle.slice(comma + 1));
    if (!cityQuery || hayCity !== cityQuery) return false;
    if (!stateQuery) return true;
    return hayState === stateQuery || stateQuery.startsWith(hayState);
  }

  if (hayCity === needle) return true;
  return needle.length >= 3 && hayCity.startsWith(needle);
}

export function monthlyPropertyTax(price: number, annualRate: number): number {
  if (!(price > 0) || !(annualRate > 0)) return 0;
  return (price * annualRate) / 12;
}

export function grossYield(
  monthlyRent: number,
  price: number,
  propertyTaxRate = 0,
): number | null {
  if (!(monthlyRent > 0) || !(price > 0)) return null;
  const netMonthly = monthlyRent - monthlyPropertyTax(price, propertyTaxRate);
  return (netMonthly * 12) / price;
}

export function withStatePropertyTax(row: MarketRow): MarketRow {
  const propertyTaxRate = propertyTaxRateForState(row.state);
  const nextYield = grossYield(row.zori, row.zhvi, propertyTaxRate);
  return {
    ...row,
    propertyTaxRate,
    grossYield: nextYield ?? row.grossYield,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export function underwriteMarket(
  row: MarketRow,
  assumptions: UnderwritingAssumptions = UNDERWRITING_DEFAULTS,
): UnderwritingResult {
  const taxRate =
    row.propertyTaxRate && row.propertyTaxRate > 0
      ? row.propertyTaxRate
      : propertyTaxRateForState(row.state) || undefined;
  return underwrite(
    {
      purchasePrice: row.zhvi,
      monthlyRent: row.zori,
      rentEstimateSource: "zori",
      propertyTaxRate: taxRate,
      insuranceRate: insuranceRateForState(row.state),
    },
    assumptions,
  );
}

function compareNullable(
  a: number | null | undefined,
  b: number | null | undefined,
  fallbackA: string,
  fallbackB: string,
  descending: boolean,
): number {
  if (a == null && b == null) return fallbackA.localeCompare(fallbackB);
  if (a == null) return 1;
  if (b == null) return -1;
  const diff = descending ? b - a : a - b;
  return diff !== 0 ? diff : fallbackA.localeCompare(fallbackB);
}

export function sortMarkets(
  markets: MarketRow[],
  sort: MarketSort = DEFAULT_MARKET_SORT,
  assumptions: UnderwritingAssumptions = UNDERWRITING_DEFAULTS,
): MarketRow[] {
  const copy = [...markets];
  const needsModeled =
    sort === "dscrDesc" ||
    sort === "dscrAsc" ||
    sort === "dscrMarginDesc" ||
    sort === "dscrMarginAsc" ||
    sort === "priceGapDesc" ||
    sort === "priceGapAsc" ||
    sort === "noiDesc" ||
    sort === "noiAsc";
  const modeled = needsModeled
    ? new Map(copy.map((row) => [row.zip, underwriteMarket(row, assumptions)]))
    : null;
  const modeledOf = (row: MarketRow): UnderwritingResult => modeled!.get(row.zip)!;

  switch (sort) {
    case "priceAsc":
      copy.sort((a, b) => a.zhvi - b.zhvi);
      return copy;
    case "priceDesc":
      copy.sort((a, b) => b.zhvi - a.zhvi);
      return copy;
    case "yieldAsc":
      copy.sort((a, b) => a.grossYield - b.grossYield);
      return copy;
    case "yieldDesc":
      copy.sort((a, b) => b.grossYield - a.grossYield);
      return copy;
    case "rentAsc":
      copy.sort((a, b) => a.zori - b.zori);
      return copy;
    case "rentDesc":
      copy.sort((a, b) => b.zori - a.zori);
      return copy;
    case "dscrAsc":
    case "dscrDesc":
      copy.sort((a, b) =>
        compareNullable(
          modeledOf(a).dscr,
          modeledOf(b).dscr,
          a.zip,
          b.zip,
          sort === "dscrDesc",
        ),
      );
      return copy;
    case "dscrMarginAsc":
    case "dscrMarginDesc":
      copy.sort((a, b) =>
        compareNullable(
          modeledOf(a).dscr == null ? null : modeledOf(a).dscr! - modeledOf(a).targetDscr,
          modeledOf(b).dscr == null ? null : modeledOf(b).dscr! - modeledOf(b).targetDscr,
          a.zip,
          b.zip,
          sort === "dscrMarginDesc",
        ),
      );
      return copy;
    case "priceGapAsc":
    case "priceGapDesc":
      copy.sort((a, b) =>
        compareNullable(
          modeledOf(a).priceGap,
          modeledOf(b).priceGap,
          a.zip,
          b.zip,
          sort === "priceGapDesc",
        ),
      );
      return copy;
    case "noiAsc":
    case "noiDesc":
      copy.sort((a, b) =>
        compareNullable(
          modeledOf(a).noi,
          modeledOf(b).noi,
          a.zip,
          b.zip,
          sort === "noiDesc",
        ),
      );
      return copy;
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

function togglePair(current: MarketSort, desc: MarketSort, asc: MarketSort): MarketSort {
  if (current === desc) return asc;
  if (current === asc) return desc;
  return desc;
}

export function toggleMarketSort(
  current: MarketSort,
  column: MarketSortColumn,
): MarketSort {
  switch (column) {
    case "price":
      return togglePair(current, "priceDesc", "priceAsc");
    case "rent":
      return togglePair(current, "rentDesc", "rentAsc");
    case "yield":
      return togglePair(current, "yieldDesc", "yieldAsc");
    case "dscr":
      return togglePair(current, "dscrDesc", "dscrAsc");
    case "dscrMargin":
      return togglePair(current, "dscrMarginDesc", "dscrMarginAsc");
    case "priceGap":
      return togglePair(current, "priceGapDesc", "priceGapAsc");
    case "noi":
      return togglePair(current, "noiDesc", "noiAsc");
    default: {
      const _exhaustive: never = column;
      return _exhaustive;
    }
  }
}

export function marketSortDirection(
  sort: MarketSort,
  column: MarketSortColumn,
): "ascending" | "descending" | "none" {
  switch (column) {
    case "price":
      if (sort === "priceAsc") return "ascending";
      if (sort === "priceDesc") return "descending";
      return "none";
    case "rent":
      if (sort === "rentAsc") return "ascending";
      if (sort === "rentDesc") return "descending";
      return "none";
    case "yield":
      if (sort === "yieldAsc") return "ascending";
      if (sort === "yieldDesc") return "descending";
      return "none";
    case "dscr":
      if (sort === "dscrAsc") return "ascending";
      if (sort === "dscrDesc") return "descending";
      return "none";
    case "dscrMargin":
      if (sort === "dscrMarginAsc") return "ascending";
      if (sort === "dscrMarginDesc") return "descending";
      return "none";
    case "priceGap":
      if (sort === "priceGapAsc") return "ascending";
      if (sort === "priceGapDesc") return "descending";
      return "none";
    case "noi":
      if (sort === "noiAsc") return "ascending";
      if (sort === "noiDesc") return "descending";
      return "none";
    default: {
      const _exhaustive: never = column;
      return _exhaustive;
    }
  }
}

export function filterAndRank(markets: MarketRow[], options: RankOptions): MarketRow[] {
  const minPrice = options.minPrice ?? DEFAULT_MIN_PRICE;
  const maxPrice = options.maxPrice ?? DEFAULT_MAX_PRICE;
  const crimeFilter = options.crimeFilter ?? "averageOrBetter";
  const minPopulation = options.minPopulation ?? 0;
  const state = options.state?.trim().toUpperCase();
  const city = options.city?.trim();
  const crimeCutoff =
    crimeFilter === "excludeHigh" ? percentile(markets.map((m) => m.crimeRate), 0.75) : null;

  const filtered = markets.filter((row) => {
      if (row.zhvi < minPrice) return false;
      if (row.zhvi > maxPrice) return false;
      if (state && row.state.toUpperCase() !== state) return false;
      if (city && !marketCityMatches(row.city, row.state, city)) return false;
      if (minPopulation > 0 && (row.population == null || row.population < minPopulation)) {
        return false;
      }
      if (crimeFilter === "all") return true;
      if (crimeFilter === "averageOrBetter") {
        return row.crimeRate <= options.nationalCrimeRate;
      }
      return row.crimeRate <= (crimeCutoff ?? Infinity);
    });

  return sortMarkets(filtered, options.sort ?? DEFAULT_MARKET_SORT);
}
