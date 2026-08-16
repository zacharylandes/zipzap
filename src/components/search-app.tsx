"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MarketsPanel } from "@/components/markets-panel";
import { PageHero } from "@/components/page-hero";
import { ListingsPanel } from "@/components/listings-panel";
import { Reveal } from "@/components/reveal";
import { SearchForm } from "@/components/search-form";
import { SourceMarquee } from "@/components/source-marquee";
import { SourceStatusList } from "@/components/source-status";
import type { ListingSort } from "@/markets/enrich";
import { homeHref, supportedCountryOptions, zipListingsHref, type MarketQuery } from "@/markets/query";
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
import { listingLocationsForCountry } from "@/search/locations";

type SearchAppProps = {
  query: MarketQuery;
};

const COUNTRY_OPTIONS = supportedCountryOptions();

export function SearchApp({ query }: SearchAppProps) {
  const router = useRouter();
  const country = query.country ?? "US";
  const minPrice = query.minPrice ?? DEFAULT_MIN_PRICE;
  const maxPrice = query.maxPrice ?? DEFAULT_MAX_PRICE;
  const crimeFilter: CrimeFilter = query.crimeFilter ?? "averageOrBetter";
  const state = query.state ?? "";
  const [sort, setSort] = useState<MarketSort>(query.sort ?? DEFAULT_MARKET_SORT);
  const [page, setPage] = useState(query.page ?? 1);
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [marketsTotal, setMarketsTotal] = useState(0);
  const [marketsLoading, setMarketsLoading] = useState(country === "US");
  const [marketsError, setMarketsError] = useState<string | null>(null);
  const [listingSort, setListingSort] = useState<ListingSort>("yieldDesc");
  const [listingPage, setListingPage] = useState(1);
  const { loading, elapsedSec, error, result, run } = useSearchRequest();

  useEffect(() => {
    if (country !== "US") return;
    const params = new URLSearchParams({
      minPrice: String(minPrice),
      maxPrice: String(maxPrice),
      crimeFilter,
    });
    if (state) params.set("state", state);
    const controller = new AbortController();
    setMarketsLoading(true);
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
  }, [country, minPrice, maxPrice, crimeFilter, state]);

  const sortedMarkets = useMemo(() => sortMarkets(markets, sort), [markets, sort]);

  useEffect(() => {
    if (country === "US") return;
    const next = homeHref({ country });
    const current = `/${window.location.search}`;
    if (current !== next) {
      router.replace(next, { scroll: false });
    }
  }, [country, router]);

  function replaceQuery(next: Partial<MarketQuery>) {
    if ((next.country ?? country) === "US") {
      setMarketsLoading(true);
    }
    setPage(1);
    setListingPage(1);
    router.replace(
      homeHref({
        country: next.country ?? country,
        minPrice: next.minPrice ?? minPrice,
        maxPrice: next.maxPrice ?? maxPrice,
        crimeFilter: next.crimeFilter ?? crimeFilter,
        state: next.state ?? state,
      }),
      { scroll: false },
    );
  }

  const countryLabel = COUNTRY_OPTIONS.find((option) => option.code === country)?.label ?? country;
  const isUsInvestorScan = country === "US";
  const listingLocations = useMemo(() => listingLocationsForCountry(country), [country]);

  return (
    <div className="hs-app">
      <PageHero
        title={isUsInvestorScan ? "Highest rent for the price" : `Homes for sale in ${countryLabel}`}
        sub={
          isUsInvestorScan
            ? "US ZIPs ranked by typical rent versus typical home value. Counties above average violent crime are hidden."
            : `Live for-sale listings from the primary portal for ${countryLabel}, with gross yield using Numbeo 1BR rent.`
        }
        actions={
          <>
            <a className="hs-btn hs-btn--primary" href="#search">
              Get started
            </a>
            <Link href="/calc" className="hs-btn hs-btn--ghost-light">
              Sell vs buy
            </Link>
          </>
        }
      />

      <SourceMarquee />

      <section className="hs-section" id="search">
        <div className="hs-content hs-scan">
          <Reveal className="hs-scan__intro">
            <p className="hs-eyebrow">The scan</p>
            <h2 className="hs-heading">A search that&apos;s <em>unique to you</em></h2>
            <p className="hs-copy">
              {isUsInvestorScan
                ? "Filter by price, crime, and state. Then open the ZIPs with the strongest rent-to-price."
                : `Search live for-sale listings in ${countryLabel} and estimate gross yield from Numbeo 1BR rent.`}
            </p>
          </Reveal>
          <label className="hs-field hs-field--country">
            <span>Country</span>
            <select
              value={country}
              onChange={(e) => replaceQuery({ country: e.target.value as MarketQuery["country"] })}
              aria-label="Country"
            >
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {isUsInvestorScan ? (
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
                  country,
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
          ) : (
            <>
              <SearchForm
                key={country}
                country={country}
                locations={listingLocations}
                onSubmit={run}
                loading={loading}
              />
              {error ? (
                <p className="hs-error" role="alert">
                  {error}
                </p>
              ) : null}
              {result ? <SourceStatusList sources={result.sources} /> : null}
              <ListingsPanel
                listings={result?.listings ?? []}
                loading={loading}
                loadingMessage={`Scraping listings… ${elapsedSec}s. This usually takes 20–45 seconds.`}
                emptyMessage={
                  result
                    ? "No listings matched this search."
                    : "Submit a search to load live listings."
                }
                sort={listingSort}
                page={listingPage}
                onSort={(value) => {
                  setListingSort(value);
                  setListingPage(1);
                }}
                onPage={setListingPage}
              />
            </>
          )}
          {isUsInvestorScan && marketsError ? (
            <p className="hs-error" role="alert">
              {marketsError}
            </p>
          ) : null}
        </div>
      </section>

      <section className="hs-section">
        <div className="hs-content">
          <Reveal>
            <p className="hs-eyebrow">Why it works</p>
            <h2 className="hs-heading">Yield first. Listings second.</h2>
            <p className="hs-copy">
              Rank markets first. Then open the homes. Yield, crime, and live photos stay in one
              place so you are not bouncing between portals.
            </p>
            <div className="hs-features">
              <article className="hs-feature">
                <h3 className="hs-feature__title">ZIPs ranked by rent versus price</h3>
                <p className="hs-feature__text">
                  Typical rent over typical home value, using Zillow ZHVI and ZORI, so the strongest
                  gross yields surface first.
                </p>
              </article>
              <article className="hs-feature">
                <h3 className="hs-feature__title">A crime filter that stays out of the way</h3>
                <p className="hs-feature__text">
                  Counties above average violent crime are hidden by default. You can loosen the
                  filter without leaving the scan.
                </p>
              </article>
              <article className="hs-feature">
                <h3 className="hs-feature__title">Live listings from the local portal</h3>
                <p className="hs-feature__text">
                  Open a ZIP for Realtor.com photos, or switch country for Idealista, Inmuebles24,
                  Mercado Libre, and more.
                </p>
              </article>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
