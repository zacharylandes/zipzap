"use client";

import { useMemo } from "react";
import { PaginationControls } from "@/components/pagination-controls";
import { sortSearchListings, type ListingSort } from "@/markets/enrich";
import {
  marketSortDirection,
  toggleMarketSort,
  type MarketSortColumn,
} from "@/markets/rank";
import type { Listing } from "@/search/schema";

export const LISTINGS_PAGE_SIZE = 25;

const SORT_LABELS: Record<ListingSort, string> = {
  priceDesc: "Price: high to low",
  priceAsc: "Price: low to high",
  rentDesc: "Rent: high to low",
  rentAsc: "Rent: low to high",
  yieldDesc: "Yield: high to low",
  yieldAsc: "Yield: low to high",
};

function SortableHeader({
  label,
  column,
  sort,
  onSort,
}: {
  label: string;
  column: MarketSortColumn;
  sort: ListingSort;
  onSort: (value: ListingSort) => void;
}) {
  const direction = marketSortDirection(sort, column);
  const indicator =
    direction === "ascending" ? " ↑" : direction === "descending" ? " ↓" : "";

  return (
    <th scope="col" aria-sort={direction}>
      <button
        type="button"
        className="hs-markets__sort"
        onClick={() => onSort(toggleMarketSort(sort, column))}
        aria-label={`Sort by ${label}${indicator ? `, ${direction}` : ""}`}
      >
        {label}
        <span aria-hidden="true">{indicator}</span>
      </button>
    </th>
  );
}

function formatMoney(value: number | null | undefined, currency: string): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

function yieldLabel(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function bedsLabel(listing: Listing): string {
  const parts = [
    listing.bedrooms != null ? `${listing.bedrooms} bd` : null,
    listing.bathrooms != null ? `${listing.bathrooms} ba` : null,
    listing.area != null
      ? `${listing.area} ${listing.areaUnit ?? ""}`.trim()
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

type ListingsPanelProps = {
  listings: Listing[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  sort: ListingSort;
  page: number;
  onSort: (sort: ListingSort) => void;
  onPage: (page: number) => void;
};

export function ListingsPanel({
  listings,
  loading,
  loadingMessage = "Fetching listings from live sources…",
  emptyMessage = "No listings matched this search.",
  sort,
  page,
  onSort,
  onPage,
}: ListingsPanelProps) {
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
    <div className="hs-markets">
      <p className="hs-markets__count">
        {sorted.length} listings · {SORT_LABELS[sort]}
      </p>

      <PaginationControls
        page={safePage}
        pageCount={pageCount}
        total={sorted.length}
        pageSize={LISTINGS_PAGE_SIZE}
        onPage={onPage}
        label="Listings"
      />

      <div className="hs-markets__table-wrap">
        <table className="hs-markets__table hs-listings__table">
          <caption className="visually-hidden">Property listings ranked by selected column</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Photo</span>
              </th>
              <SortableHeader label="Yield" column="yield" sort={sort} onSort={onSort} />
              <th scope="col">Property</th>
              <SortableHeader label="Price" column="price" sort={sort} onSort={onSort} />
              <SortableHeader label="Est. rent" column="rent" sort={sort} onSort={onSort} />
              <th scope="col">Details</th>
              <th scope="col">
                <span className="visually-hidden">Listing</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {slice.map((listing) => (
              <tr key={listing.id} className="hs-markets__row">
                <td className="hs-listings__thumb">
                  {listing.thumbnailUrl ? (
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View photo for ${listing.title}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={listing.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="hs-listings__thumb-img"
                      />
                    </a>
                  ) : null}
                </td>
                <td className="hs-markets__yield">{yieldLabel(listing.grossYield)}</td>
                <td className="hs-listings__title">
                  <span className="hs-listings__name">{listing.title}</span>
                  {listing.location ? (
                    <span className="hs-listings__location">{listing.location}</span>
                  ) : null}
                </td>
                <td>
                  <span>{formatMoney(listing.price, listing.currency)}</span>
                  {listing.originalCurrency &&
                  listing.originalPrice != null &&
                  listing.originalCurrency !== listing.currency ? (
                    <span className="hs-listings__listed-in">
                      Listed {formatMoney(listing.originalPrice, listing.originalCurrency)}
                    </span>
                  ) : null}
                </td>
                <td>
                  {listing.estimatedMonthlyRent != null
                    ? `${formatMoney(listing.estimatedMonthlyRent, listing.currency)}/mo${
                        listing.rentEstimateSource === "numbeo" ? " (Numbeo)" : ""
                      }`
                    : "—"}
                </td>
                <td>{bedsLabel(listing)}</td>
                <td className="hs-markets__action">
                  <a
                    className="hs-btn hs-btn--outline hs-markets__pick"
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open listing
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
