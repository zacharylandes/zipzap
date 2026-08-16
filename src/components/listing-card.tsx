"use client";

import { useEffect, useId, useState } from "react";
import type { Listing } from "@/search/schema";

function formatPrice(listing: Listing): string {
  if (listing.price == null) return "Price on request";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: listing.currency,
      maximumFractionDigits: 0,
    }).format(listing.price);
  } catch {
    return `${listing.currency} ${listing.price}`;
  }
}

function largerPhoto(url: string): string {
  return url.replace(/od-w\d+_h\d+/i, "od-w1024_h768");
}

export function ListingCard({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
          <p className="hs-card__price">{formatPrice(listing)}</p>
          {listing.originalCurrency &&
          listing.originalPrice != null &&
          listing.originalCurrency !== listing.currency ? (
            <p className="hs-card__price-note">
              Listed in{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: listing.originalCurrency,
                maximumFractionDigits: 0,
              }).format(listing.originalPrice)}
            </p>
          ) : null}
          <p className="hs-card__meta">
            {[
              listing.bedrooms != null ? `${listing.bedrooms} bd` : null,
              listing.bathrooms != null ? `${listing.bathrooms} ba` : null,
              listing.area != null
                ? `${listing.area} ${listing.areaUnit ?? ""}`.trim()
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Details on listing"}
          </p>
          {listing.location ? (
            <p className="hs-card__location">{listing.location}</p>
          ) : null}
          {listing.grossYield != null ? (
            <p className="hs-card__yield">
              {(listing.grossYield * 100).toFixed(1)}% gross yield
              {listing.estimatedMonthlyRent != null
                ? ` · est. rent ${new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: listing.currency,
                    maximumFractionDigits: 0,
                  }).format(listing.estimatedMonthlyRent)}/mo${
                    listing.rentEstimateSource === "numbeo" ? " (Numbeo)" : ""
                  }`
                : ""}
            </p>
          ) : null}
          {listing.crimeVsNational != null ? (
            <p className="hs-card__crime">Crime {listing.crimeVsNational.toFixed(2)}× national</p>
          ) : null}
        </div>
      </article>
      {open ? (
        <div
          className="hs-lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="hs-lightbox__panel"
            onClick={(event) => event.stopPropagation()}
          >
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
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
              <h3 id={titleId} className="hs-lightbox__title">
                {listing.title}
              </h3>
              <p className="hs-lightbox__price">{formatPrice(listing)}</p>
              <div className="hs-lightbox__actions">
                <a
                  className="hs-btn hs-btn--primary hs-btn--arrow"
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open listing
                </a>
                <button type="button" className="hs-btn hs-btn--outline" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
