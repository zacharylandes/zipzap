import type { Pool } from "pg";
import { loadStoredZoningHits } from "@/lib/enrichment/db-zoning";
import {
  buildTravisEnrichment,
  enrichmentCacheFresh,
  type PropertyRow,
} from "@/lib/enrichment/enrich-travis";
import type { PropertyEnrichment } from "@/lib/enrichment/types";

export async function loadPropertyEnrichment(pool: Pool, propertyId: number): Promise<PropertyEnrichment | null> {
  const cached = await pool.query<{ payload: PropertyEnrichment; retrieved_at: Date }>(
    `SELECT payload, retrieved_at FROM property_enrichment_cache WHERE property_id = $1`,
    [propertyId],
  );
  const hit = cached.rows[0];
  if (hit && enrichmentCacheFresh(hit.retrieved_at)) {
    const cached = hit.payload as PropertyEnrichment;
    cached.storedZoning = await loadStoredZoningHits(pool, propertyId);
    return cached;
  }

  const row = await loadPropertyRow(pool, propertyId);
  if (!row) return null;

  const enrichment = await buildTravisEnrichment(row);
  enrichment.storedZoning = await loadStoredZoningHits(pool, propertyId);
  if (enrichment.storedZoning.length > 0) {
    enrichment.notes.push(
      "Base zoning also available from the local PostGIS import (run make austin-zoning && make austin-zoning-link).",
    );
  }
  await pool.query(
    `
    INSERT INTO property_enrichment_cache (property_id, payload, retrieved_at)
    VALUES ($1, $2::jsonb, now())
    ON CONFLICT (property_id) DO UPDATE SET payload = EXCLUDED.payload, retrieved_at = EXCLUDED.retrieved_at
    `,
    [propertyId, JSON.stringify(enrichment)],
  );
  return enrichment;
}

async function loadPropertyRow(pool: Pool, propertyId: number): Promise<PropertyRow | null> {
  const result = await pool.query<PropertyRow & { raw_payload: Record<string, unknown> | null }>(
    `
    SELECT
      p.id,
      p.parcel_id,
      p.county,
      p.county_fips,
      p.state,
      p.address,
      p.city,
      p.zip,
      p.latitude,
      p.longitude,
      p.lot_area::text,
      p.lot_area_unit,
      ST_AsGeoJSON(ST_Transform(p.geom, 4326)) AS geometry,
      sr.raw_payload
    FROM property p
    LEFT JOIN LATERAL (
      SELECT raw_payload
      FROM source_record
      WHERE data_source_id = p.source_id AND external_id = p.external_id
      ORDER BY id DESC
      LIMIT 1
    ) sr ON true
    WHERE p.id = $1
    `,
    [propertyId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return row;
}
