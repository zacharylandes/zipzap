"use client";

import { useMemo } from "react";
import { ListingCard } from "@/components/listing-card";
import { PaginationControls } from "@/components/pagination-controls";
import { sortSearchListings, type ListingSort } from "@/markets/enrich";
import type { Listing } from "@/search/schema";

export const LISTINGS_PAGE_SIZE = 12;

const SORT_OPTIONS: { value: ListingSort; label: string }[] = [
  { value: "priceDesc", label: "Price: high to low" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "rentDesc", label: "Rent estimate: high to low" },
  { value: "rentAsc", label: "Rent estimate: low to high" },
  { value: "yield", label: "Yield: high to low" },
];

type PaginatedResultsGridProps = {
  listings: Listing[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  sort: ListingSort;
  page: number;
  onSort: (sort: ListingSort) => void;
  onPage: (page: number) => void;
};

export function PaginatedResultsGrid({
  listings,
  loading,
  loadingMessage = "Fetching listings from live sources…",
  emptyMessage = "No listings matched this search.",
  sort,
  page,
  onSort,
  onPage,
}: PaginatedResultsGridProps) {
  const sorted = useMemo(() => sortSearchListings(listings, sort), [listings, sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / LISTINGS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const slice = sorted.slice(
    (safePage - 1) * LISTINGS_PAGE_SIZE,
    safePage * LISTINGS_PAGE_SIZE,
  );

  if (loading) {
    return (
      <div className="hs-results hs-results--loading" aria-live="polite">
        {loadingMessage}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="hs-results hs-results--empty" aria-live="polite">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="hs-paginated">
      <div className="hs-toolbar">
        <label className="hs-field hs-field--inline">
          <span>Sort by</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as ListingSort)}
            aria-label="Sort listings"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <PaginationControls
          page={safePage}
          pageCount={pageCount}
          total={sorted.length}
          pageSize={LISTINGS_PAGE_SIZE}
          onPage={onPage}
          label="Listings"
        />
      </div>
      <div className="hs-results-grid" role="list">
        {slice.map((listing) => (
          <div key={listing.id} role="listitem">
            <ListingCard listing={listing} />
          </div>
        ))}
      </div>
      {pageCount > 1 ? (
        <PaginationControls
          page={safePage}
          pageCount={pageCount}
          total={sorted.length}
          pageSize={LISTINGS_PAGE_SIZE}
          onPage={onPage}
          label="Listings"
        />
      ) : null}
    </div>
  );
}
