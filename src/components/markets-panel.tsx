"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PaginationControls } from "@/components/pagination-controls";
import {
  MARKETS_PAGE_SIZE,
  marketSortDirection,
  toggleMarketSort,
  type CrimeFilter,
  type MarketRow,
  type MarketSort,
  type MarketSortColumn,
} from "@/markets/rank";

type MarketsPanelProps = {
  markets: MarketRow[];
  states: string[];
  minPrice: number;
  maxPrice: number;
  crimeFilter: CrimeFilter;
  state: string;
  city: string;
  sort: MarketSort;
  page: number;
  loading?: boolean;
  total?: number;
  zipHref: (market: MarketRow) => string;
  onMinPrice: (value: number) => void;
  onMaxPrice: (value: number) => void;
  onCrimeFilter: (value: CrimeFilter) => void;
  onState: (value: string) => void;
  onCity: (value: string) => void;
  onSort: (value: MarketSort) => void;
  onPage: (value: number) => void;
};

const SORT_LABELS: Record<MarketSort, string> = {
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
  sort: MarketSort;
  onSort: (value: MarketSort) => void;
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

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function yieldLabel(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function taxRateLabel(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function MarketsPanel({
  markets,
  states,
  minPrice,
  maxPrice,
  crimeFilter,
  state,
  city,
  sort,
  page,
  loading,
  total,
  zipHref,
  onMinPrice,
  onMaxPrice,
  onCrimeFilter,
  onState,
  onCity,
  onSort,
  onPage,
}: MarketsPanelProps) {
  const router = useRouter();
  const [cityDraft, setCityDraft] = useState(city);
  const totalCount = total ?? markets.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / MARKETS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const pageMarkets = markets.slice(
    (safePage - 1) * MARKETS_PAGE_SIZE,
    safePage * MARKETS_PAGE_SIZE,
  );

  useEffect(() => {
    setCityDraft(city);
  }, [city]);

  function commitCity() {
    const next = cityDraft.trim();
    if (next !== city.trim()) onCity(next);
  }

  return (
    <div className="hs-markets">
      <form
        className="hs-form hs-markets__filters"
        onSubmit={(e) => {
          e.preventDefault();
          commitCity();
        }}
      >
        <div className="hs-form__grid">
          <label className="hs-field">
            <span>City</span>
            <input
              type="search"
              value={cityDraft}
              onChange={(e) => setCityDraft(e.target.value)}
              onBlur={commitCity}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCity();
                }
              }}
              placeholder="Oklahoma City"
              aria-label="City"
            />
          </label>
          <label className="hs-field">
            <span>Min typical price</span>
            <input
              type="number"
              min={50_000}
              step={10_000}
              value={minPrice}
              onChange={(e) => onMinPrice(Number(e.target.value) || 0)}
              aria-label="Min typical price"
            />
          </label>
          <label className="hs-field">
            <span>Max typical price</span>
            <input
              type="number"
              min={50_000}
              step={10_000}
              value={maxPrice}
              onChange={(e) => onMaxPrice(Number(e.target.value) || 0)}
              aria-label="Max typical price"
            />
          </label>
          <label className="hs-field">
            <span>Crime filter</span>
            <select
              value={crimeFilter}
              onChange={(e) => onCrimeFilter(e.target.value as CrimeFilter)}
              aria-label="Crime filter"
            >
              <option value="averageOrBetter">Average or better</option>
              <option value="excludeHigh">Exclude only high crime</option>
              <option value="all">No crime filter</option>
            </select>
          </label>
          <label className="hs-field">
            <span>State</span>
            <select
              value={state}
              onChange={(e) => onState(e.target.value)}
              aria-label="State filter"
            >
              <option value="">All states</option>
              {states.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hs-markets__count">
          {loading
            ? "Loading markets…"
            : `${totalCount} ZIPs · $${Math.round(minPrice / 1000)}k–$${Math.round(
                maxPrice / 1000,
              )}k · ${SORT_LABELS[sort]}`}
        </p>
      </form>

      {!loading && totalCount > 0 ? (
        <PaginationControls
          page={safePage}
          pageCount={pageCount}
          total={totalCount}
          pageSize={MARKETS_PAGE_SIZE}
          onPage={onPage}
          label="ZIPs"
        />
      ) : null}

      {loading ? (
        <div className="hs-results hs-results--loading" aria-live="polite">
          Ranking US ZIPs by rent versus price…
        </div>
      ) : markets.length === 0 ? (
        <div className="hs-results hs-results--empty" aria-live="polite">
          No ZIPs match these filters.
        </div>
      ) : (
        <div className="hs-markets__table-wrap">
          <table className="hs-markets__table">
            <caption className="visually-hidden">
              US ZIP codes ranked with crime filter applied
            </caption>
            <thead>
              <tr>
                <SortableHeader label="Yield" column="yield" sort={sort} onSort={onSort} />
                <th scope="col">Prop. tax</th>
                <th scope="col">ZIP</th>
                <th scope="col">City</th>
                <SortableHeader
                  label="Typical price"
                  column="price"
                  sort={sort}
                  onSort={onSort}
                />
                <SortableHeader
                  label="Typical rent"
                  column="rent"
                  sort={sort}
                  onSort={onSort}
                />
                <th scope="col">Crime vs US</th>
                <th scope="col">
                  <span className="visually-hidden">Listings</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageMarkets.map((market) => {
                const href = zipHref(market);
                return (
                  <tr
                    key={market.zip}
                    className="hs-markets__row"
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("a")) return;
                      router.push(href);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(href);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`View homes in ${market.zip}`}
                  >
                    <td className="hs-markets__yield">{yieldLabel(market.grossYield)}</td>
                    <td>{market.propertyTaxRate != null ? taxRateLabel(market.propertyTaxRate) : "—"}</td>
                    <td>{market.zip}</td>
                    <td>
                      {market.city}, {market.state}
                    </td>
                    <td>{usd(market.zhvi)}</td>
                    <td>{usd(market.zori)}/mo</td>
                    <td>{market.crimeVsNational.toFixed(2)}×</td>
                    <td className="hs-markets__action">
                      <Link
                        href={href}
                        className="hs-btn hs-btn--outline hs-markets__pick"
                      >
                        View photos
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && pageCount > 1 ? (
        <PaginationControls
          page={safePage}
          pageCount={pageCount}
          total={totalCount}
          pageSize={MARKETS_PAGE_SIZE}
          onPage={onPage}
          label="ZIPs"
        />
      ) : null}
    </div>
  );
}
