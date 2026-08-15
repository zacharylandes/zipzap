import type { Listing, SearchInput } from "@/search/schema";

export function filterListingsBySearchInput(
  listings: Listing[],
  input: SearchInput,
): Listing[] {
  const hasPriceFilter = input.minPrice != null || input.maxPrice != null;

  return listings.filter((listing) => {
    if (hasPriceFilter) {
      if (listing.price == null) return false;
      if (input.minPrice != null && listing.price < input.minPrice) return false;
      if (input.maxPrice != null && listing.price > input.maxPrice) return false;
    }

    if (input.bedrooms != null) {
      if (listing.bedrooms == null || listing.bedrooms < input.bedrooms) return false;
    }

    if (input.bathrooms != null) {
      if (listing.bathrooms == null || listing.bathrooms < input.bathrooms) return false;
    }

    if (input.minArea != null) {
      if (listing.area == null || listing.area < input.minArea) return false;
    }

    if (input.maxArea != null) {
      if (listing.area == null || listing.area > input.maxArea) return false;
    }

    return true;
  });
}
