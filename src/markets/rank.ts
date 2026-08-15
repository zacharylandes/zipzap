export const DEFAULT_MIN_PRICE = 90_000;
export const DEFAULT_MAX_PRICE = 240_000;
export const DEFAULT_MIN_POPULATION = 5_000;

export type CrimeFilter = "averageOrBetter" | "excludeHigh";
export type MarketSort =
  | "priceDesc"
  | "priceAsc"
  | "rentDesc"
  | "rentAsc"
  | "yieldDesc"
  | "yieldAsc";

export type MarketSortColumn = "yield" | "price" | "rent";

export const DEFAULT_MARKET_SORT: MarketSort = "priceDesc";
export const MARKETS_PAGE_SIZE = 25;

export type MarketRow = {
  zip: string;
  city: string;
  state: string;
  county: string;
  zhvi: number;
  zori: number;
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
  minPopulation?: number;
  sort?: MarketSort;
  page?: number;
  nationalCrimeRate: number;
};

export function grossYield(monthlyRent: number, price: number): number | null {
  if (!(monthlyRent > 0) || !(price > 0)) return null;
  return (monthlyRent * 12) / price;
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

export function sortMarkets(markets: MarketRow[], sort: MarketSort = DEFAULT_MARKET_SORT): MarketRow[] {
  const copy = [...markets];
  if (sort === "priceAsc") {
    copy.sort((a, b) => a.zhvi - b.zhvi);
    return copy;
  }
  if (sort === "yieldDesc") {
    copy.sort((a, b) => b.grossYield - a.grossYield);
    return copy;
  }
  if (sort === "yieldAsc") {
    copy.sort((a, b) => a.grossYield - b.grossYield);
    return copy;
  }
  if (sort === "rentAsc") {
    copy.sort((a, b) => a.zori - b.zori);
    return copy;
  }
  if (sort === "rentDesc") {
    copy.sort((a, b) => b.zori - a.zori);
    return copy;
  }
  copy.sort((a, b) => b.zhvi - a.zhvi);
  return copy;
}

export function toggleMarketSort(
  current: MarketSort,
  column: MarketSortColumn,
): MarketSort {
  if (column === "price") {
    if (current === "priceDesc") return "priceAsc";
    if (current === "priceAsc") return "priceDesc";
    return "priceDesc";
  }
  if (column === "rent") {
    if (current === "rentDesc") return "rentAsc";
    if (current === "rentAsc") return "rentDesc";
    return "rentDesc";
  }
  if (current === "yieldDesc") return "yieldAsc";
  if (current === "yieldAsc") return "yieldDesc";
  return "yieldDesc";
}

export function marketSortDirection(
  sort: MarketSort,
  column: MarketSortColumn,
): "ascending" | "descending" | "none" {
  if (column === "price") {
    if (sort === "priceAsc") return "ascending";
    if (sort === "priceDesc") return "descending";
    return "none";
  }
  if (column === "rent") {
    if (sort === "rentAsc") return "ascending";
    if (sort === "rentDesc") return "descending";
    return "none";
  }
  if (sort === "yieldAsc") return "ascending";
  if (sort === "yieldDesc") return "descending";
  return "none";
}

export function filterAndRank(markets: MarketRow[], options: RankOptions): MarketRow[] {
  const minPrice = options.minPrice ?? DEFAULT_MIN_PRICE;
  const maxPrice = options.maxPrice ?? DEFAULT_MAX_PRICE;
  const crimeFilter = options.crimeFilter ?? "averageOrBetter";
  const minPopulation = options.minPopulation ?? 0;
  const state = options.state?.trim().toUpperCase();
  const crimeCutoff =
    crimeFilter === "excludeHigh" ? percentile(markets.map((m) => m.crimeRate), 0.75) : null;

  const filtered = markets.filter((row) => {
      if (row.zhvi < minPrice) return false;
      if (row.zhvi > maxPrice) return false;
      if (state && row.state.toUpperCase() !== state) return false;
      if (minPopulation > 0 && (row.population == null || row.population < minPopulation)) {
        return false;
      }
      if (crimeFilter === "averageOrBetter") {
        return row.crimeRate <= options.nationalCrimeRate;
      }
      return row.crimeRate <= (crimeCutoff ?? Infinity);
    });

  return sortMarkets(filtered, options.sort ?? DEFAULT_MARKET_SORT);
}
