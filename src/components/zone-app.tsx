"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useState } from "react";
import type { PropertyEnrichment } from "@/lib/enrichment/types";
import type { PropertyDetail, PropertySummary, SearchResponse } from "@/lib/properties/types";

const ZoneMap = dynamic(
  () => import("@/components/zone-map").then((mod) => mod.ZoneMap),
  { ssr: false, loading: () => <div className="zone-map" aria-hidden /> },
);

type Coverage = {
  loaded: { fips: string; name: string; parcel_source_status: string; properties: number }[];
};

export function ZoneApp() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PropertySummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PropertyDetail | null>(null);
  const [parcels, setParcels] = useState<GeoJSON.FeatureCollection | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [databaseDown, setDatabaseDown] = useState(false);

  useEffect(() => {
    void fetch("/api/coverage")
      .then(async (response) => {
        if (!response.ok) {
          setDatabaseDown(true);
          return;
        }
        setCoverage((await response.json()) as Coverage);
      })
      .catch(() => setDatabaseDown(true));
  }, []);

  async function runSearch(nextPage: number, event?: FormEvent) {
    event?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    setMessage(null);
    setPage(nextPage);
    const response = await fetch(`/api/properties/search?q=${encodeURIComponent(q)}&page=${nextPage}&pageSize=20`);
    setLoading(false);
    if (!response.ok) {
      setDatabaseDown(true);
      setResults([]);
      setSelected(null);
      return;
    }
    const body = (await response.json()) as SearchResponse;
    setResults(body.results);
    setTotal(body.total);
    if (body.results.length === 0) {
      setSelected(null);
      setMessage("That address was not found in the loaded parcels.");
      return;
    }
    setMessage(body.searchNote ?? null);
    if (body.results.length === 1) await openProperty(body.results[0].id);
  }

  async function openProperty(id: number) {
    const response = await fetch(`/api/properties/${id}`);
    if (!response.ok) return;
    setSelected((await response.json()) as PropertyDetail);
  }

  async function loadBbox(bbox: string) {
    const response = await fetch(`/api/parcels?bbox=${encodeURIComponent(bbox)}&limit=200`);
    if (!response.ok) return;
    setParcels((await response.json()) as GeoJSON.FeatureCollection);
  }

  const feature = selected?.geometry
    ? {
        type: "Feature" as const,
        geometry: selected.geometry,
        properties: { id: selected.id },
      }
    : null;

  return (
    <div className="zone">
      <form className="zone-search" onSubmit={(event) => void runSearch(1, event)}>
        <label className="zone-search__label" htmlFor="zone-q">
          Address or parcel ID
        </label>
        <div className="zone-search__row">
          <input
            id="zone-q"
            className="zone-search__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="100 Congress Ave, Austin, TX"
            autoComplete="off"
          />
          <button className="hs-btn hs-btn--primary" type="submit" disabled={loading}>
            {loading ? "Searching" : "Search"}
          </button>
        </div>
        <p className="zone-search__note">
          {databaseDown
            ? "Parcel database is not running."
            : coverage && coverage.loaded.length > 0
              ? `Loaded: ${coverage.loaded.map((county) => `${county.name} (${county.properties.toLocaleString("en-US")})`).join(", ")}.`
              : "No counties are loaded yet."}{" "}
          Search uses loaded parcel records only.
        </p>
      </form>
      <div className="zone-body">
        <ZoneMap selected={feature} parcels={parcels} onSelect={(id) => void openProperty(id)} onBbox={(bbox) => void loadBbox(bbox)} />
        <aside className="zone-panel" aria-live="polite">
          {message ? <p className="zone-panel__empty">{message}</p> : null}
          {results && results.length > 1 ? (
            <ul className="zone-results">
              {results.map((result) => (
                <li key={result.id}>
                  <button type="button" onClick={() => void openProperty(result.id)}>
                    <span>{result.address ?? "Address not in source"}</span>
                    <span>{result.parcelId}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {total > 20 ? (
            <div className="zone-pager">
              <button type="button" disabled={page <= 1} onClick={() => void runSearch(page - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button type="button" disabled={page * 20 >= total} onClick={() => void runSearch(page + 1)}>
                Next
              </button>
            </div>
          ) : null}
          {selected ? <PropertyPanel property={selected} /> : null}
        </aside>
      </div>
    </div>
  );
}

function PropertyPanel({ property }: { property: PropertyDetail }) {
  const [enrichment, setEnrichment] = useState<PropertyEnrichment | null>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  useEffect(() => {
    setEnrichment(null);
    setEnrichError(null);
    setEnrichLoading(true);
    void fetch(`/api/properties/${property.id}/enrichment`)
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "enrichment failed");
        }
        setEnrichment((await response.json()) as PropertyEnrichment);
      })
      .catch((error: unknown) => {
        setEnrichError(error instanceof Error ? error.message : "Enrichment unavailable");
      })
      .finally(() => setEnrichLoading(false));
  }, [property.id]);

  const retrieved = property.source.retrievedAt?.slice(0, 10) ?? "not in source";
  const agency = property.source.attribute
    ? `${property.source.attribute}, compiled by ${property.source.agency}`
    : property.source.agency;

  return (
    <div className="zone-panel-detail">
      <dl className="zone-facts">
        <div>
          <dt>Parcel ID</dt>
          <dd>
            {property.parcelId}
            {property.parcelIdDerived ? " (derived from source fields)" : ""}
          </dd>
        </div>
        <div>
          <dt>County</dt>
          <dd>{property.county}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{property.address ?? "Not in source"}</dd>
        </div>
        <div>
          <dt>Lot area</dt>
          <dd>{property.lotArea === null ? "Not in source" : `${property.lotArea} ${property.lotAreaUnit ?? ""}`.trim()}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{agency}</dd>
        </div>
        <div>
          <dt>Retrieved</dt>
          <dd>{retrieved}</dd>
        </div>
      </dl>
      {enrichLoading ? <p className="zone-panel__note">Loading Austin enrichment…</p> : null}
      {enrichError ? <p className="zone-panel__empty">{enrichError}</p> : null}
      {enrichment ? <EnrichmentSections enrichment={enrichment} /> : null}
    </div>
  );
}

function EnrichmentSections({ enrichment }: { enrichment: PropertyEnrichment }) {
  const b = enrichment.building;
  const p = enrichment.property;
  return (
    <div className="zone-enrichment">
      <h3 className="zone-section">Property</h3>
      <dl className="zone-facts">
        <Fact label="ZIP" value={p.zip} />
        <Fact
          label="Lot area (sq ft)"
          value={
            p.lotAreaSqft === null
              ? null
              : `${p.lotAreaSqft.toLocaleString("en-US", { maximumFractionDigits: 0 })}${p.lotAreaSqftDerived ? " (derived from source units)" : ""}`
          }
        />
        <Fact
          label="Lot area (acres)"
          value={
            p.lotAreaAcres === null
              ? null
              : `${p.lotAreaAcres.toLocaleString("en-US", { maximumFractionDigits: 4 })}${p.lotAreaAcresDerived ? " (derived from source units)" : ""}`
          }
        />
      </dl>
      <h3 className="zone-section">Building &amp; appraisal (StratMap / public CAMA fields)</h3>
      <dl className="zone-facts">
        <Fact label="Year built" value={b.yearBuilt?.toString() ?? null} />
        <Fact label="Land use" value={b.landUse} />
        <Fact label="Market / assessed value" value={formatMoney(b.assessedValue)} />
        <Fact label="Land value" value={formatMoney(b.landValue)} />
        <Fact label="Improvement value" value={formatMoney(b.improvementValue)} />
        <Fact label="Tax year" value={b.taxYear?.toString() ?? null} />
        <Fact label="Building sqft (source)" value={b.buildingSqft?.toLocaleString("en-US") ?? null} />
        <Fact
          label="Building footprints (count)"
          value={b.coaBuildingFootprintCount === null ? null : String(b.coaBuildingFootprintCount)}
        />
        <Fact
          label="Building footprint area"
          value={
            b.buildingFootprintSqft === null
              ? null
              : `${b.buildingFootprintSqft.toLocaleString("en-US")}${b.buildingFootprintSource ? ` (${b.buildingFootprintSource})` : ""}`
          }
        />
        <Fact
          label="Impervious patches (2023)"
          value={b.imperviousPatchCount === null ? null : String(b.imperviousPatchCount)}
        />
      </dl>
      {enrichment.storedZoning.length > 0 ? (
        <>
          <h3 className="zone-section">Zoning (imported, PostGIS)</h3>
          <ul className="zone-enrichment-list">
            {enrichment.storedZoning.map((hit) => (
              <li key={`${hit.districtCode}-${hit.intersectionPct}`}>
                <strong>{hit.districtCode}</strong>
                {hit.intersectionPct !== null ? ` · ${hit.intersectionPct.toFixed(1)}% of parcel` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h3 className="zone-section">Zoning (live GIS, {enrichment.zoning.length})</h3>
      {enrichment.zoning.length === 0 ? (
        <p className="zone-panel__note">No base zoning polygon intersects this parcel in City of Austin GIS.</p>
      ) : (
        <ul className="zone-enrichment-list">
          {enrichment.zoning.map((hit) => (
            <li key={`${hit.layerKey}-${hit.featureId}`}>
              <strong>{hit.zoningCode ?? hit.zoningBase ?? "Zoning"}</strong>
              {hit.zoningBase && hit.zoningCode !== hit.zoningBase ? ` (base ${hit.zoningBase})` : ""}
            </li>
          ))}
        </ul>
      )}
      {enrichment.ordinances.length > 0 ? (
        <>
          <h3 className="zone-section">Zoning ordinances ({enrichment.ordinances.length})</h3>
          <ul className="zone-enrichment-list">
            {enrichment.ordinances.map((ord) => (
              <li key={`${ord.featureId}-${ord.ordinanceNumber}`}>
                {ord.ordinanceUrl ? (
                  <a href={ord.ordinanceUrl} target="_blank" rel="noreferrer">
                    {ord.ordinanceNumber ?? "Ordinance"}
                  </a>
                ) : (
                  (ord.ordinanceNumber ?? "Ordinance polygon")
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {enrichment.overlays.length > 0 ? (
        <>
          <h3 className="zone-section">Overlays &amp; historic ({enrichment.overlays.length})</h3>
          <ul className="zone-enrichment-list">
            {enrichment.overlays.map((hit) => (
              <li key={`${hit.layerKey}-${hit.featureId}`}>
                {hit.overlayName ?? hit.layerName}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {enrichment.planning.length > 0 ? (
        <>
          <h3 className="zone-section">Planning ({enrichment.planning.length})</h3>
          <ul className="zone-enrichment-list">
            {enrichment.planning.map((hit) => (
              <li key={`${hit.layerKey}-${hit.featureId}`}>
                <strong>{hit.layerName}</strong>
                {hit.label ? ` — ${hit.label}` : ""}
                {hit.code ? ` (${hit.code})` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {enrichment.constraints.length > 0 ? (
        <>
          <h3 className="zone-section">Development constraints ({enrichment.constraints.length})</h3>
          <ul className="zone-enrichment-list">
            {enrichment.constraints.map((hit) => (
              <li key={`${hit.layerKey}-${hit.featureId}`}>
                <strong>{hit.layerName}</strong>
                {hit.label && hit.label !== hit.layerName ? ` — ${hit.label}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h3 className="zone-section">Development history</h3>
      <dl className="zone-facts">
        <Fact label="Building permits" value={String(enrichment.developmentHistory.permitCount)} />
        <Fact label="Demolition permits" value={String(enrichment.developmentHistory.demolitionCount)} />
        <Fact label="Plan review cases" value={String(enrichment.developmentHistory.planReviewCount)} />
        <Fact label="Latest issue date" value={enrichment.developmentHistory.latestIssueDate?.slice(0, 10) ?? null} />
      </dl>
      {enrichment.permits.length > 0 ? (
        <>
          <h3 className="zone-section">Permit records ({enrichment.permits.length})</h3>
          <ul className="zone-enrichment-list">
            {enrichment.permits.slice(0, 12).map((permit) => (
              <li key={`${permit.permitNumber}-${permit.issueDate}`}>
                <strong>{permit.permitNumber ?? "Permit"}</strong>
                {permit.issueDate ? ` · ${permit.issueDate.slice(0, 10)}` : ""}
                {permit.workDescription ? ` — ${permit.workDescription}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {enrichment.notes.length > 0 ? (
        <ul className="zone-panel__notes">
          {enrichment.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? "Not in source"}</dd>
    </div>
  );
}

function formatMoney(value: number | null): string | null {
  if (value === null) return null;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
