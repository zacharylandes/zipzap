import {
  insuranceRateForState,
  propertyTaxRateForState,
} from "@/calc/state-costs";
import {
  UNDERWRITING_DEFAULTS,
  underwrite,
  type UnderwritingAssumptions,
  type UnderwritingInput,
  type UnderwritingResult,
} from "@/calc/underwriting";
import type { MarketRow } from "@/markets/rank";
import type { Listing } from "@/search/schema";

function positiveRate(value: number | null | undefined): number | undefined {
  return value != null && value > 0 ? value : undefined;
}

export function listingUnderwritingInput(
  listing: Listing,
  market?: MarketRow | null,
): UnderwritingInput {
  const state = listing.state ?? market?.state;
  const taxRate =
    positiveRate(market?.propertyTaxRate) ??
    (state ? positiveRate(propertyTaxRateForState(state)) : undefined);
  return {
    purchasePrice: listing.price,
    monthlyRent: listing.estimatedMonthlyRent ?? null,
    actualMonthlyRent: listing.actualMonthlyRent,
    compsMonthlyRent: listing.compsMonthlyRent,
    estimatedMonthlyRent: listing.estimatedMonthlyRent,
    rentEstimateSource: listing.rentEstimateSource,
    rentCompCount: listing.rentCompCount,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    area: listing.area,
    propertyTaxesAnnual: listing.propertyTaxesAnnual,
    insuranceAnnual: listing.insuranceAnnual,
    hoaMonthly: listing.hoaMonthly,
    utilitiesMonthly: listing.utilitiesMonthly,
    propertyTaxRate: taxRate,
    insuranceRate: state ? insuranceRateForState(state) : undefined,
  };
}

export function underwriteListing(
  listing: Listing,
  assumptions: UnderwritingAssumptions = UNDERWRITING_DEFAULTS,
  market?: MarketRow | null,
): UnderwritingResult {
  return underwrite(listingUnderwritingInput(listing, market), assumptions);
}
