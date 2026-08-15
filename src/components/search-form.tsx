"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  COUNTRIES,
  COUNTRY_CURRENCY,
  COUNTRY_LABELS,
  type CountryCode,
  type ListingType,
  type SearchInput,
} from "@/search/schema";

type SearchFormProps = {
  onSubmit: (input: SearchInput) => void;
  loading?: boolean;
};

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const [country, setCountry] = useState<CountryCode>("MX");
  const [location, setLocation] = useState("");
  const [listingType, setListingType] = useState<ListingType>("rent");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");

  const currency = useMemo(() => COUNTRY_CURRENCY[country], [country]);
  const areaLabel = country === "US" ? "sq ft" : "m²";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      country,
      location,
      listingType,
      minPrice: optionalNumber(minPrice),
      maxPrice: optionalNumber(maxPrice),
      bedrooms: optionalNumber(bedrooms),
      bathrooms: optionalNumber(bathrooms),
      minArea: optionalNumber(minArea),
      maxArea: optionalNumber(maxArea),
    });
  }

  return (
    <form className="hs-form" onSubmit={handleSubmit} aria-label="Housing search">
      <div className="hs-form__grid">
        <label className="hs-field">
          <span>Country</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            aria-label="Country"
          >
            {COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {COUNTRY_LABELS[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="hs-field hs-field--wide">
          <span>City or region</span>
          <input
            required
            minLength={2}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Ciudad de México"
            aria-label="City or region"
          />
        </label>

        <fieldset className="hs-field">
          <legend>Listing type</legend>
          <div className="hs-tabs" role="tablist" aria-label="Listing type">
            <button
              type="button"
              className={listingType === "rent" ? "is-active" : ""}
              aria-pressed={listingType === "rent"}
              onClick={() => setListingType("rent")}
            >
              Rent
            </button>
            <button
              type="button"
              className={listingType === "sale" ? "is-active" : ""}
              aria-pressed={listingType === "sale"}
              onClick={() => setListingType("sale")}
            >
              Sale
            </button>
          </div>
        </fieldset>

        <label className="hs-field">
          <span>Min price ({currency})</span>
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            aria-label={`Minimum price in ${currency}`}
          />
        </label>

        <label className="hs-field">
          <span>Max price ({currency})</span>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label={`Maximum price in ${currency}`}
          />
        </label>

        <label className="hs-field">
          <span>Bedrooms</span>
          <input
            type="number"
            min={0}
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            aria-label="Bedrooms"
          />
        </label>

        <label className="hs-field">
          <span>Bathrooms</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            aria-label="Bathrooms"
          />
        </label>

        <label className="hs-field">
          <span>Min area ({areaLabel})</span>
          <input
            type="number"
            min={0}
            value={minArea}
            onChange={(e) => setMinArea(e.target.value)}
            aria-label={`Minimum area in ${areaLabel}`}
          />
        </label>

        <label className="hs-field">
          <span>Max area ({areaLabel})</span>
          <input
            type="number"
            min={0}
            value={maxArea}
            onChange={(e) => setMaxArea(e.target.value)}
            aria-label={`Maximum area in ${areaLabel}`}
          />
        </label>
      </div>

      <button className="hs-btn hs-btn--primary" type="submit" disabled={loading}>
        {loading ? "Searching…" : "Search listings"}
      </button>
    </form>
  );
}
