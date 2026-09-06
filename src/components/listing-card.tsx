"use client";

import { useEffect, useId, useState } from "react";
import { underwriteListing } from "@/calc/underwrite-sources";
import { ListingUnderwriting } from "@/components/listing-underwriting";
import { formatDscr, formatMoney, formatSignedMoney, formatYield } from "@/components/money";
import { useUnderwritingAssumptions } from "@/components/underwriting-provider";
import type { MarketRow } from "@/markets/rank";
import type { Listing } from "@/search/schema";

function largerPhoto(url: string): string {
  return url.replace(/od-w\d+_h\d+/i, "od-w1024_h768");
}

function bedsLabel(listing: Listing): string {
  return (
    [
      listing.bedrooms != null ? `${listing.bedrooms} bed` : null,
      listing.bathrooms != null ? `${listing.bathrooms} bath` : null,
    ]
      .filter(Boolean)
      .join(" / ") || "Details on listing"
  );
}

export function ListingDetailDialog({
  listing,
  market,
  titleId,
  onClose,
}: {
  listing: Listing;
  market?: MarketRow | null;
  titleId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="hs-lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div className="hs-lightbox__panel hs-lightbox__panel--uw" onClick={(event) => event.stopPropagation()}>
        {listing.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="hs-lightbox__img"
            src={largerPhoto(listing.thumbnailUrl)}
            alt=""
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="hs-card__placeholder">No photo</div>
        )}
        <div className="hs-lightbox__body">
          <button
            type="button"
            className="hs-lightbox__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
          <h3 id={titleId} className="hs-lightbox__title">
            {listing.title}
          </h3>
          <p className="hs-lightbox__price">{formatMoney(listing.price, listing.currency)}</p>
          <ListingUnderwriting listing={listing} market={market} />
          <div className="hs-lightbox__actions">
            <a
              className="hs-btn hs-btn--primary hs-btn--arrow"
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open listing
            </a>
            <button type="button" className="hs-btn hs-btn--outline" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListingCard({
  listing,
  market,
}: {
  listing: Listing;
  market?: MarketRow | null;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const { assumptions } = useUnderwritingAssumptions();
  const underwriting = underwriteListing(listing, assumptions, market);

  return (
    <>
      <article className="hs-card">
        <button
          type="button"
          className="hs-card__hit"
          onClick={() => setOpen(true)}
          aria-label={`View photo of ${listing.title}`}
        />
        <div className="hs-card__media" aria-hidden={listing.thumbnailUrl ? undefined : true}>
          {listing.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.thumbnailUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="hs-card__placeholder">No photo</div>
          )}
        </div>
        <div className="hs-card__body">
          <p className="hs-card__source">{listing.sourceName}</p>
          <h3 className="hs-card__title">{listing.title}</h3>
          <p className="hs-card__price">{formatMoney(listing.price, listing.currency)}</p>
          {listing.originalCurrency &&
          listing.originalPrice != null &&
          listing.originalCurrency !== listing.currency ? (
            <p className="hs-card__price-note">
              Listed in {formatMoney(listing.originalPrice, listing.originalCurrency)}
            </p>
          ) : null}
          <p className="hs-card__meta">{bedsLabel(listing)}</p>
          {listing.location ? <p className="hs-card__location">{listing.location}</p> : null}
          {underwriting.dscr != null ? (
            <div className="hs-card__metrics">
              <p className="hs-card__dscr">{formatDscr(underwriting.dscr)} modeled DSCR</p>
              <p>
                Est. rent: {formatMoney(underwriting.monthlyRent, listing.currency)}/mo
              </p>
              <p>Est. NOI: {formatMoney(underwriting.noi, listing.currency)}</p>
              <p>Target DSCR: {formatDscr(underwriting.targetDscr)}</p>
              <p>
                DSCR-supported price:{" "}
                {formatMoney(underwriting.dscrSupportedPurchasePrice, listing.currency)}
              </p>
              <p>
                Potential discount: {formatSignedMoney(underwriting.priceGap, listing.currency)}
              </p>
              <p>
                Confidence: {underwriting.confidence} · {underwriting.rentEstimateLabel}
              </p>
            </div>
          ) : listing.grossYield != null ? (
            <p className="hs-card__yield">{formatYield(listing.grossYield)} gross yield</p>
          ) : null}
          {listing.grossYield != null && underwriting.dscr != null ? (
            <p className="hs-card__yield-secondary">{formatYield(listing.grossYield)} gross yield</p>
          ) : null}
          {listing.crimeVsNational != null ? (
            <p className="hs-card__crime">Crime {listing.crimeVsNational.toFixed(2)}× national</p>
          ) : null}
        </div>
      </article>
      {open ? (
        <ListingDetailDialog
          listing={listing}
          market={market}
          titleId={titleId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
