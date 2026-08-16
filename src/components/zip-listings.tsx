"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { ListingsPanel } from "@/components/listings-panel";
import { SourceStatusList } from "@/components/source-status";
import { toListingSort, type MarketQuery } from "@/markets/query";
import type { ListingSort } from "@/markets/enrich";
import type { MarketRow } from "@/markets/rank";
import { useSearchRequest } from "@/search/use-search-request";

type ZipListingsProps = {
  zip: string;
  query: MarketQuery;
  market: MarketRow | null;
  backHref: string;
};

export function ZipListings({ zip, query, market, backHref }: ZipListingsProps) {
  const minPrice = query.minPrice ?? 90_000;
  const maxPrice = query.maxPrice ?? 240_000;
  const [sort, setSort] = useState<ListingSort>(() => toListingSort(query.sort ?? "priceDesc"));
  const [page, setPage] = useState(query.page ?? 1);
  const { loading, elapsedSec, error, result, run } = useSearchRequest();
  const city = market?.city ?? "";
  const state = market?.state ?? "";

  useEffect(() => {
    void run({
      country: "US",
      location: city && state ? `${city}, ${state}` : zip,
      listingType: "sale",
      minPrice,
      maxPrice,
      zip,
    });
  }, [city, minPrice, maxPrice, run, state, zip]);

  const heading =
    city && state ? `Homes for sale in ${city}, ${state} ${zip}` : `Homes for sale in ${zip}`;

  const loadingMessage = useMemo(() => {
    if (result?.cached) return "Loaded cached listings.";
    return `Scraping Realtor.com for photos… ${elapsedSec}s. This usually takes 20–45 seconds.`;
  }, [elapsedSec, result?.cached]);

  return (
    <div className="hs-app">
      <PageHero
        compact
        title="Highest rent for the price"
        sub={`Live for-sale listings in this ZIP, $${Math.round(minPrice / 1000)}k–$${Math.round(maxPrice / 1000)}k.`}
      />

      <section className="hs-section">
        <div className="hs-content">
          <div className="hs-markets__listings">
            <Link href={backHref} className="hs-btn hs-btn--ghost">
              Back to ZIP list
            </Link>
            <h2 className="hs-heading hs-heading--sm hs-markets__picked">{heading}</h2>
            <p className="hs-copy">
              Photos and prices from Realtor.com. Estimated rent is this ZIP’s typical rent.
            </p>
          </div>
          {error ? (
            <p className="hs-error" role="alert">
              {error}
            </p>
          ) : null}
          {result ? <SourceStatusList sources={result.sources} /> : null}
          <ListingsPanel
            listings={result?.listings ?? []}
            loading={loading}
            loadingMessage={loadingMessage}
            emptyMessage={
              result
                ? "No listings matched this search."
                : "Loading live listings."
            }
            sort={sort}
            page={page}
            onSort={(value) => {
              setSort(value);
              setPage(1);
            }}
            onPage={setPage}
          />
        </div>
      </section>
    </div>
  );
}
