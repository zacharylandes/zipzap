import { underwriteListing } from "@/calc/underwrite-sources";
import {
  UNDERWRITING_DEFAULTS,
  type UnderwritingAssumptions,
  type UnderwritingResult,
} from "@/calc/underwriting";
import { grossYield, type MarketRow, type MarketSort } from "@/markets/rank";
import type { Listing } from "@/search/schema";

export type ListingSort = MarketSort;
export const DEFAULT_LISTING_SORT: ListingSort = "dscrDesc";

export const LISTING_RANK_MODES: { id: ListingSort; label: string }[] = [
  { id: "dscrDesc", label: "DSCR" },
  { id: "dscrMarginDesc", label: "DSCR Margin" },
  { id: "priceGapDesc", label: "DSCR-Supported Price Discount" },
  { id: "noiDesc", label: "NOI" },
  { id: "yieldDesc", label: "Gross Yield" },
  { id: "priceAsc", label: "Price" },
];

export function enrichListings(
  listings: Listing[],
  market: MarketRow | null | undefined,
): Listing[] {
  if (!market) return listings;
  return listings.map((listing) => ({
    ...listing,
    zip: market.zip,
    state: market.state,
    estimatedMonthlyRent: market.zori,
    rentEstimateSource: "zori",
    grossYield:
      listing.price != null
        ? grossYield(market.zori, listing.price, market.propertyTaxRate ?? 0)
        : null,
    crimeVsNational: market.crimeVsNational,
  }));
}

export type NumbeoRents = {
  oneBedroom: number;
  threeBedroom: number | null;
};

export function numbeoRentForBedrooms(
  rents: NumbeoRents,
  bedrooms: number | null | undefined,
): number {
  const three = rents.threeBedroom;
  if (three != null && three > 0) {
    if (bedrooms != null && bedrooms >= 3) return three;
    if (bedrooms === 2) return (rents.oneBedroom + three) / 2;
  }
  return rents.oneBedroom;
}

export function enrichListingsWithNumbeo(
  listings: Listing[],
  rents: NumbeoRents | number | null | undefined,
): Listing[] {
  const normalized =
    typeof rents === "number"
      ? { oneBedroom: rents, threeBedroom: null }
      : rents;
  if (normalized == null || !(normalized.oneBedroom > 0)) return listings;
  return listings.map((listing) => {
    const monthlyRent = numbeoRentForBedrooms(normalized, listing.bedrooms);
    return {
      ...listing,
      estimatedMonthlyRent: monthlyRent,
      rentEstimateSource: "numbeo",
      grossYield:
        listing.price != null ? grossYield(monthlyRent, listing.price) : null,
    };
  });
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

export function sortSearchListings(
  listings: Listing[],
  sort: ListingSort,
  assumptions: UnderwritingAssumptions = UNDERWRITING_DEFAULTS,
  market?: MarketRow | null,
): Listing[] {
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
    ? new Map(
        listings.map((listing) => [listing.id, underwriteListing(listing, assumptions, market)]),
      )
    : null;
  const modeledOf = (listing: Listing): UnderwritingResult => modeled!.get(listing.id)!;

  return [...listings].sort((a, b) => {
    switch (sort) {
      case "yieldDesc":
      case "yieldAsc":
        return compareNullableNumber(
          a.grossYield,
          b.grossYield,
          a.title,
          b.title,
          sort === "yieldDesc",
        );
      case "rentDesc":
      case "rentAsc":
        return compareNullableNumber(
          a.estimatedMonthlyRent,
          b.estimatedMonthlyRent,
          a.title,
          b.title,
          sort === "rentDesc",
        );
      case "priceDesc":
      case "priceAsc":
        return compareNullableNumber(a.price, b.price, a.title, b.title, sort === "priceDesc");
      case "dscrDesc":
        return (
          compareNullableNumber(modeledOf(a).dscr, modeledOf(b).dscr, a.title, b.title, true) ||
          compareNullableNumber(modeledOf(a).priceGap, modeledOf(b).priceGap, a.title, b.title, true) ||
          compareNullableNumber(modeledOf(a).noi, modeledOf(b).noi, a.title, b.title, true) ||
          compareNullableNumber(a.grossYield, b.grossYield, a.title, b.title, true)
        );
      case "dscrAsc":
        return compareNullableNumber(modeledOf(a).dscr, modeledOf(b).dscr, a.title, b.title, false);
      case "dscrMarginDesc":
      case "dscrMarginAsc":
        return compareNullableNumber(
          modeledOf(a).dscr == null ? null : modeledOf(a).dscr! - modeledOf(a).targetDscr,
          modeledOf(b).dscr == null ? null : modeledOf(b).dscr! - modeledOf(b).targetDscr,
          a.title,
          b.title,
          sort === "dscrMarginDesc",
        );
      case "priceGapDesc":
      case "priceGapAsc":
        return compareNullableNumber(
          modeledOf(a).priceGap,
          modeledOf(b).priceGap,
          a.title,
          b.title,
          sort === "priceGapDesc",
        );
      case "noiDesc":
      case "noiAsc":
        return compareNullableNumber(
          modeledOf(a).noi,
          modeledOf(b).noi,
          a.title,
          b.title,
          sort === "noiDesc",
        );
      default: {
        const _exhaustive: never = sort;
        return _exhaustive;
      }
    }
  });
}
