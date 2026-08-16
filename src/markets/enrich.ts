import { grossYield, type MarketRow, type MarketSort } from "@/markets/rank";
import type { Listing } from "@/search/schema";

export type ListingSort = MarketSort;

export function enrichListings(
  listings: Listing[],
  market: MarketRow | null | undefined,
): Listing[] {
  if (!market) return listings;
  return listings.map((listing) => ({
    ...listing,
    zip: market.zip,
    estimatedMonthlyRent: market.zori,
    rentEstimateSource: "zori",
    grossYield:
      listing.price != null ? grossYield(market.zori, listing.price) : null,
    crimeVsNational: market.crimeVsNational,
  }));
}

export function enrichListingsWithNumbeo(
  listings: Listing[],
  monthlyRent: number | null | undefined,
): Listing[] {
  if (monthlyRent == null || !(monthlyRent > 0)) return listings;
  return listings.map((listing) => ({
    ...listing,
    estimatedMonthlyRent: monthlyRent,
    rentEstimateSource: "numbeo",
    grossYield:
      listing.price != null ? grossYield(monthlyRent, listing.price) : null,
  }));
}

function compareNullableNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  titleA: string,
  titleB: string,
  descending: boolean,
): number {
  if (a == null && b == null) return titleA.localeCompare(titleB);
  if (a == null) return 1;
  if (b == null) return -1;
  return descending ? b - a : a - b;
}

export function sortSearchListings(listings: Listing[], sort: ListingSort): Listing[] {
  return [...listings].sort((a, b) => {
    if (sort === "yieldDesc" || sort === "yieldAsc") {
      return compareNullableNumber(
        a.grossYield,
        b.grossYield,
        a.title,
        b.title,
        sort === "yieldDesc",
      );
    }
    if (sort === "rentDesc" || sort === "rentAsc") {
      return compareNullableNumber(
        a.estimatedMonthlyRent,
        b.estimatedMonthlyRent,
        a.title,
        b.title,
        sort === "rentDesc",
      );
    }
    return compareNullableNumber(a.price, b.price, a.title, b.title, sort === "priceDesc");
  });
}
