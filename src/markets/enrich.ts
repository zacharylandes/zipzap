import { grossYield, type MarketRow } from "@/markets/rank";
import type { Listing } from "@/search/schema";

export function enrichListings(
  listings: Listing[],
  market: MarketRow | null | undefined,
): Listing[] {
  if (!market) return listings;
  return listings.map((listing) => ({
    ...listing,
    zip: market.zip,
    estimatedMonthlyRent: market.zori,
    grossYield:
      listing.price != null ? grossYield(market.zori, listing.price) : null,
    crimeVsNational: market.crimeVsNational,
  }));
}

export type ListingSort = "yield" | "priceDesc" | "priceAsc" | "rentDesc" | "rentAsc";

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
    if (sort === "yield") {
      return compareNullableNumber(a.grossYield, b.grossYield, a.title, b.title, true);
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
