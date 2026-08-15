"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FacebookConnect } from "@/components/facebook-connect";
import { MarketsPanel } from "@/components/markets-panel";
import { PaginatedResultsGrid } from "@/components/paginated-results-grid";
import { SearchForm } from "@/components/search-form";
import { SourceStatusList } from "@/components/source-status";
import type { ListingSort } from "@/markets/enrich";
import { homeHref, zipListingsHref, type MarketQuery } from "@/markets/query";
import {
  DEFAULT_MAX_PRICE,
  DEFAULT_MIN_PRICE,
  DEFAULT_MARKET_SORT,
  sortMarkets,
  type CrimeFilter,
  type MarketRow,
  type MarketSort,
} from "@/markets/rank";
import { useSearchRequest } from "@/search/use-search-request";

type Mode = "investor" | "browse";

type SearchAppProps = {
  query: MarketQuery;
  facebookEnabled?: boolean;
};

export function SearchApp({ query, facebookEnabled = false }: SearchAppProps) {
  const router = useRouter();
  const minPrice = query.minPrice ?? DEFAULT_MIN_PRICE;
  const maxPrice = query.maxPrice ?? DEFAULT_MAX_PRICE;
  const crimeFilter: CrimeFilter = query.crimeFilter ?? "averageOrBetter";
  const state = query.state ?? "";
  const [sort, setSort] = useState<MarketSort>(query.sort ?? DEFAULT_MARKET_SORT);
  const [page, setPage] = useState(query.page ?? 1);

  const [mode, setMode] = useState<Mode>("investor");
  const [browseSort, setBrowseSort] = useState<ListingSort>("priceDesc");
  const [browsePage, setBrowsePage] = useState(1);
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [marketsTotal, setMarketsTotal] = useState(0);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const { loading, elapsedSec, error, result, run } = useSearchRequest();
  const [marketsError, setMarketsError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      minPrice: String(minPrice),
      maxPrice: String(maxPrice),
      crimeFilter,
    });
    if (state) params.set("state", state);
    const controller = new AbortController();
    fetch(`/api/markets?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load markets");
        setMarkets(data.markets ?? []);
        setStates(data.states ?? []);
        setMarketsTotal(data.total ?? 0);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setMarketsError(err instanceof Error ? err.message : "Unable to load markets");
        setMarkets([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setMarketsLoading(false);
      });
    return () => controller.abort();
  }, [minPrice, maxPrice, crimeFilter, state]);

  const sortedMarkets = useMemo(() => sortMarkets(markets, sort), [markets, sort]);

  function replaceQuery(next: Partial<MarketQuery>) {
    setMarketsLoading(true);
    setPage(1);
    router.replace(
      homeHref({
        minPrice: next.minPrice ?? minPrice,
        maxPrice: next.maxPrice ?? maxPrice,
        crimeFilter: next.crimeFilter ?? crimeFilter,
        state: next.state ?? state,
      }),
      { scroll: false },
    );
  }

  const displayError = mode === "browse" ? error : marketsError;

  return (
    <div className="hs-app">
      <section className="hs-hero">
        <div className="hs-hero__inner">
          <p className="hs-eyebrow">House Search</p>
          <h1 className="hs-hero__title">
            {mode === "investor" ? "Highest rent for the price" : "Find homes across borders"}
          </h1>
          <p className="hs-hero__sub">
            {mode === "investor"
              ? "US ZIPs ranked by typical rent versus typical home value. Counties above average violent crime are hidden."
              : "Search one primary portal per country on demand. No preloading — results load only when you ask."}
          </p>
        </div>
      </section>

      <section className="hs-section">
        <div className="hs-content">
          <div className="hs-tabs hs-mode-tabs" role="tablist" aria-label="Search mode">
            <button
              type="button"
              className={mode === "investor" ? "is-active" : ""}
              aria-pressed={mode === "investor"}
              onClick={() => setMode("investor")}
            >
              Investor scan
            </button>
            <button
              type="button"
              className={mode === "browse" ? "is-active" : ""}
              aria-pressed={mode === "browse"}
              onClick={() => setMode("browse")}
            >
              Browse listings
            </button>
          </div>

          {mode === "investor" ? (
            <MarketsPanel
              markets={sortedMarkets}
              states={states}
              minPrice={minPrice}
              maxPrice={maxPrice}
              crimeFilter={crimeFilter}
              state={state}
              sort={sort}
              page={page}
              loading={marketsLoading}
              total={marketsTotal}
              zipHref={(market) =>
                zipListingsHref(market.zip, {
                  minPrice,
                  maxPrice,
                  crimeFilter,
                  state,
                })
              }
              onMinPrice={(value) => replaceQuery({ minPrice: value })}
              onMaxPrice={(value) => replaceQuery({ maxPrice: value })}
              onCrimeFilter={(value) => replaceQuery({ crimeFilter: value })}
              onState={(value) => replaceQuery({ state: value })}
              onSort={(value) => {
                setSort(value);
                setPage(1);
              }}
              onPage={setPage}
            />
          ) : null}
          {mode === "browse" ? (
            <SearchForm onSubmit={run} loading={loading} />
          ) : null}
          {mode === "browse" && facebookEnabled ? <FacebookConnect enabled /> : null}
          {displayError ? (
            <p className="hs-error" role="alert">
              {displayError}
            </p>
          ) : null}
          {mode === "browse" ? (
            <>
              {result ? <SourceStatusList sources={result.sources} /> : null}
              <PaginatedResultsGrid
                listings={result?.listings ?? []}
                loading={loading}
                loadingMessage={`Scraping listings… ${elapsedSec}s. This usually takes 20–45 seconds.`}
                emptyMessage={
                  result
                    ? "No listings matched this search."
                    : "Submit a search to load live listings."
                }
                sort={browseSort}
                page={browsePage}
                onSort={(value) => {
                  setBrowseSort(value);
                  setBrowsePage(1);
                }}
                onPage={setBrowsePage}
              />
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
