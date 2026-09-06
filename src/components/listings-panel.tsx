"use client";

import { useId, useMemo, useState } from "react";
import { underwriteListing } from "@/calc/underwrite-sources";
import { ListingDetailDialog } from "@/components/listing-card";
import { formatDscr, formatMoney, formatSignedMoney, formatYield } from "@/components/money";
import { PaginationControls } from "@/components/pagination-controls";
import { UnderwritingAssumptionsForm } from "@/components/underwriting-assumptions";
import { useUnderwritingAssumptions } from "@/components/underwriting-provider";
import { LISTING_RANK_MODES, sortSearchListings, type ListingSort } from "@/markets/enrich";
import {
  MARKET_SORT_LABELS,
  marketSortDirection,
  toggleMarketSort,
  type MarketRow,
  type MarketSortColumn,
} from "@/markets/rank";
import type { Listing } from "@/search/schema";

export const LISTINGS_PAGE_SIZE = 25;

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
  market?: MarketRow | null;
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
  market,
  onSort,
  onPage,
}: ListingsPanelProps) {
  const { assumptions } = useUnderwritingAssumptions();
  const [selected, setSelected] = useState<Listing | null>(null);
  const titleId = useId();
  const sorted = useMemo(
    () => sortSearchListings(listings, sort, assumptions, market),
    [listings, sort, assumptions, market],
  );
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
      <div className="hs-listings__toolbar">
        <label className="hs-field hs-listings__rank">
          <span>Rank listings by</span>
          <select
            value={sort}
            onChange={(event) => onSort(event.target.value as ListingSort)}
            aria-label="Rank listings by"
          >
            {(LISTING_RANK_MODES.some((mode) => mode.id === sort)
              ? LISTING_RANK_MODES
              : [...LISTING_RANK_MODES, { id: sort, label: MARKET_SORT_LABELS[sort] }]
            ).map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <p className="hs-markets__count">
          {sorted.length} listings · {MARKET_SORT_LABELS[sort]}
        </p>
      </div>

      <UnderwritingAssumptionsForm compact />

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
              <SortableHeader label="DSCR" column="dscr" sort={sort} onSort={onSort} />
              <SortableHeader label="Yield" column="yield" sort={sort} onSort={onSort} />
              <th scope="col">Property</th>
              <SortableHeader label="Price" column="price" sort={sort} onSort={onSort} />
              <SortableHeader label="Est. rent" column="rent" sort={sort} onSort={onSort} />
              <SortableHeader label="NOI" column="noi" sort={sort} onSort={onSort} />
              <SortableHeader
                label="DSCR price"
                column="priceGap"
                sort={sort}
                onSort={onSort}
              />
              <th scope="col">Details</th>
              <th scope="col">
                <span className="visually-hidden">Listing</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {slice.map((listing) => {
              const modeled = underwriteListing(listing, assumptions, market);
              return (
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
                  <td className="hs-markets__yield">{formatDscr(modeled.dscr)}</td>
                  <td>{formatYield(listing.grossYield)}</td>
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
                    {modeled.monthlyRent != null
                      ? `${formatMoney(modeled.monthlyRent, listing.currency)}/mo`
                      : "—"}
                    {modeled.monthlyRent != null ? (
                      <span className="hs-listings__listed-in">
                        {modeled.rentEstimateLabel} · {modeled.confidence}
                      </span>
                    ) : null}
                  </td>
                  <td>{formatMoney(modeled.noi, listing.currency)}</td>
                  <td>
                    {formatMoney(modeled.dscrSupportedPurchasePrice, listing.currency)}
                    <span className="hs-listings__listed-in">
                      {formatSignedMoney(modeled.priceGap, listing.currency)}
                    </span>
                  </td>
                  <td>{bedsLabel(listing)}</td>
                  <td className="hs-markets__action">
                    <button
                      type="button"
                      className="hs-btn hs-btn--outline hs-markets__pick"
                      onClick={() => setSelected(listing)}
                    >
                      Inspect
                    </button>
                    <a
                      className="hs-btn hs-btn--ghost hs-markets__pick"
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open listing
                    </a>
                  </td>
                </tr>
              );
            })}
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

      {selected ? (
        <ListingDetailDialog
          listing={selected}
          market={market}
          titleId={titleId}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
