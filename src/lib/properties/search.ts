import type { Pool } from "pg";
import {
  allowFuzzyAddressSearch,
  buildStreetTokenSql,
  FUZZY_SIMILARITY_THRESHOLD,
  searchKeys,
  streetTokenGroups,
} from "@/lib/properties/fuzzy";
import { geocodeOnelineAddress } from "@/lib/geocode/census";
import { pageBounds } from "@/lib/properties/normalize";
import type { PropertyDetail, PropertySummary, SearchResponse } from "@/lib/properties/types";

const SUMMARY_COLUMNS = `
  p.id,
  p.parcel_id,
  p.parcel_id_derived,
  p.county,
  p.county_fips,
  p.state,
  p.address,
  p.city,
  p.zip,
  p.lot_area,
  p.lot_area_unit,
  p.lot_area_derived,
  p.retrieved_at,
  p.source_updated_at,
  p.source_dataset,
  p.source_attribute,
  s.name AS source_name,
  s.agency AS source_agency,
  s.url AS source_url
`;

type SummaryRow = {
  id: number;
  parcel_id: string;
  parcel_id_derived: boolean;
  county: string;
  county_fips: string;
  state: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  lot_area: string | null;
  lot_area_unit: string | null;
  lot_area_derived: boolean;
  retrieved_at: Date | null;
  source_updated_at: Date | null;
  source_dataset: string;
  source_attribute: string | null;
  source_name: string;
  source_agency: string;
  source_url: string;
};

function whereSql(streetTokenClause: string): string {
  return `
    p.normalized_address = $1
    OR p.parcel_id = $2
    OR p.source_parcel_id = $2
    OR p.geo_id = $2
    OR ($3::boolean AND p.normalized_address LIKE $1 || '%')
    OR upper(p.city) = $1
    OR upper(p.county) = $1
    OR $1 = upper(p.county) || ' COUNTY'
    OR (
      $5::boolean
      AND p.normalized_address IS NOT NULL
      AND ($7 = '' OR p.normalized_address LIKE $7 || ' %')
      AND (${streetTokenClause})
      AND (
        word_similarity($4, p.normalized_address) >= $6::float
        OR similarity($4, p.normalized_address) >= $6::float
        OR word_similarity($1, p.normalized_address) >= $6::float
        OR similarity($1, p.normalized_address) >= $6::float
      )
    )
  `;
}

function rankSql(): string {
  return `
    CASE
      WHEN p.normalized_address = $1 THEN 0
      WHEN p.parcel_id = $2 OR p.source_parcel_id = $2 OR p.geo_id = $2 THEN 1
      WHEN $3::boolean AND p.normalized_address LIKE $1 || '%' THEN 2
      WHEN upper(p.city) = $1 THEN 3
      WHEN upper(p.county) = $1 OR $1 = upper(p.county) || ' COUNTY' THEN 4
      ELSE 5
    END,
    GREATEST(
      CASE WHEN $5::boolean THEN word_similarity($4, p.normalized_address) ELSE 0 END,
      CASE WHEN $5::boolean THEN similarity($4, p.normalized_address) ELSE 0 END,
      CASE WHEN $5::boolean THEN word_similarity($1, p.normalized_address) ELSE 0 END,
      CASE WHEN $5::boolean THEN similarity($1, p.normalized_address) ELSE 0 END
    ) DESC,
    p.id
  `;
}

export async function searchProperties(pool: Pool, q: string, page: number, pageSize: number): Promise<SearchResponse> {
  const { norm, fuzzy } = searchKeys(q);
  const prefix = /\d/.test(norm) && norm.length >= 4;
  const fuzzyEnabled = allowFuzzyAddressSearch(fuzzy);
  const houseNumber = fuzzy.match(/^(\d+)\s/)?.[1] ?? "";
  const tokenGroups = fuzzyEnabled ? streetTokenGroups(fuzzy) : [];
  const streetMatch = buildStreetTokenSql(tokenGroups, 8);
  const { limit, offset } = pageBounds(page, pageSize, 50);
  const params = [
    norm,
    q.trim(),
    prefix,
    fuzzy,
    fuzzyEnabled,
    FUZZY_SIMILARITY_THRESHOLD,
    houseNumber,
    ...streetMatch.params,
  ];
  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  const where = whereSql(streetMatch.clause);
  const totalResult = await pool.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM property p WHERE ${where}`,
    params,
  );
  const rows = await pool.query<SummaryRow>(
    `
    SELECT ${SUMMARY_COLUMNS}
    FROM property p
    JOIN data_source s ON s.id = p.source_id
    WHERE ${where}
    ORDER BY ${rankSql()}
    LIMIT $${limitParam} OFFSET $${offsetParam}
    `,
    [...params, limit, offset],
  );
  const response: SearchResponse = {
    query: q,
    page: Math.max(page, 1),
    pageSize: limit,
    total: Number(totalResult.rows[0]?.total ?? 0),
    results: rows.rows.map(toSummary),
    matchMethod: "address",
  };
  if (response.total > 0 || !shouldTryGeocode(q)) return response;
  return searchByGeocode(pool, q, page, pageSize, response);
}

const GEOCODE_BUFFER_M = 20;

function shouldTryGeocode(q: string): boolean {
  const { fuzzy } = searchKeys(q);
  return allowFuzzyAddressSearch(fuzzy);
}

async function searchByGeocode(
  pool: Pool,
  q: string,
  page: number,
  pageSize: number,
  empty: SearchResponse,
): Promise<SearchResponse> {
  const hit = await geocodeOnelineAddress(q);
  if (!hit) return empty;
  const { limit, offset } = pageBounds(page, pageSize, 50);
  const totalResult = await pool.query<{ total: string }>(
    `
    SELECT count(*)::text AS total
    FROM property p
    WHERE p.geom IS NOT NULL
      AND p.county_fips = '48453'
      AND ST_Intersects(
        p.geom,
        ST_Buffer(
          ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3083),
          $3
        )
      )
    `,
    [hit.longitude, hit.latitude, GEOCODE_BUFFER_M],
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  if (total === 0) return empty;
  const rows = await pool.query<SummaryRow>(
    `
    SELECT ${SUMMARY_COLUMNS}
    FROM property p
    JOIN data_source s ON s.id = p.source_id
    WHERE p.geom IS NOT NULL
      AND p.county_fips = '48453'
      AND ST_Intersects(
        p.geom,
        ST_Buffer(
          ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3083),
          $3
        )
      )
    ORDER BY ST_Area(
      ST_Intersection(
        p.geom,
        ST_Buffer(
          ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3083),
          $3
        )
      )
    ) DESC,
    p.id
    LIMIT $4 OFFSET $5
    `,
    [hit.longitude, hit.latitude, GEOCODE_BUFFER_M, limit, offset],
  );
  return {
    query: q,
    page: Math.max(page, 1),
    pageSize: limit,
    total,
    results: rows.rows.map(toSummary),
    matchMethod: "geocode",
    geocodeMatchedAddress: hit.matchedAddress,
    searchNote:
      "Matched by U.S. Census geocoding and parcel geometry. StratMap situs for this parcel may be missing or incomplete.",
  };
}

export async function getProperty(pool: Pool, id: number): Promise<PropertyDetail | null> {
  const result = await pool.query<SummaryRow & { latitude: number | null; longitude: number | null; geometry: string | null }>(
    `
    SELECT ${SUMMARY_COLUMNS},
      p.latitude,
      p.longitude,
      ST_AsGeoJSON(ST_Transform(p.geom, 4326)) AS geometry
    FROM property p
    JOIN data_source s ON s.id = p.source_id
    WHERE p.id = $1
    `,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...toSummary(row),
    latitude: row.latitude,
    longitude: row.longitude,
    coordinatesDerived: true,
    geometry: row.geometry ? (JSON.parse(row.geometry) as GeoJSON.Polygon | GeoJSON.MultiPolygon) : null,
  };
}

export async function parcelsInBbox(
  pool: Pool,
  bbox: [number, number, number, number],
  limit: number,
  countyFips?: string,
): Promise<GeoJSON.FeatureCollection> {
  const params: unknown[] = [...bbox, Math.min(Math.max(limit, 1), 300)];
  let countySql = "";
  if (countyFips) {
    params.push(countyFips);
    countySql = `AND p.county_fips = $${params.length}`;
  }
  const result = await pool.query<{ feature: string }>(
    `
    SELECT json_build_object(
      'type', 'Feature',
      'id', p.id,
      'geometry', ST_AsGeoJSON(ST_Transform(p.geom, 4326))::json,
      'properties', json_build_object(
        'id', p.id,
        'parcelId', p.parcel_id,
        'county', p.county,
        'address', p.address
      )
    )::text AS feature
    FROM property p
    WHERE p.geom IS NOT NULL
      AND p.geom && ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), 3083)
      ${countySql}
    LIMIT $5
    `,
    params,
  );
  return {
    type: "FeatureCollection",
    features: result.rows.map((row) => JSON.parse(row.feature) as GeoJSON.Feature),
  };
}

function stamp(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function day(value: Date | string | null): string | null {
  const text = stamp(value);
  return text ? text.slice(0, 10) : null;
}

function toSummary(row: SummaryRow): PropertySummary {
  return {
    id: row.id,
    parcelId: row.parcel_id,
    parcelIdDerived: row.parcel_id_derived,
    county: row.county,
    countyFips: row.county_fips,
    state: row.state,
    address: row.address,
    city: row.city,
    zip: row.zip,
    lotArea: row.lot_area === null ? null : Number(row.lot_area),
    lotAreaUnit: row.lot_area_unit,
    lotAreaDerived: row.lot_area_derived,
    source: {
      name: row.source_name,
      agency: row.source_agency,
      url: row.source_url,
      dataset: row.source_dataset,
      retrievedAt: stamp(row.retrieved_at),
      sourceUpdatedAt: day(row.source_updated_at),
      attribute: row.source_attribute,
    },
  };
}
