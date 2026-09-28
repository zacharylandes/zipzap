# Austin parcel enrichment — codebase audit

Date: 2026-09-27

## Parcel storage

- **Normalized table:** `property` (`db/migrations/001_init.sql`)
- **Raw features:** `source_record.raw_payload` (JSON) + geometry in EPSG:3083
- **Provenance:** `data_source`, keyed by `(source_id, external_id)` on `property`
- **Identifiers:** `parcel_identifier` (`prop_id`, `geo_id`, `derived_hash`)

## Parcel schema (normalized)

| Column | Use |
|--------|-----|
| `parcel_id`, `source_parcel_id`, `geo_id` | TCAD / StratMap ids |
| `address`, `city`, `zip`, `normalized_address` | Situs search |
| `lot_area`, `lot_area_unit` | Source area only (not converted in ingest) |
| `latitude`, `longitude`, `coordinates_derived` | Centroid EPSG:4326 |
| `geom` | PostGIS `MultiPolygon`, EPSG:3083, GiST indexed |
| `zoning_status`, `zoning_status_reason` | Placeholder until enrichment runs |
| `source_*`, `retrieved_at` | StratMap / TxGIO lineage |

StratMap attributes not copied to columns today (`YEAR_BUILT`, values, land use) — they remain in `source_record.raw_payload`.

## Polygons and PostGIS

- Ingest projects to **EPSG:3083** (`python/ingestion/sources/texas.py`).
- API returns **GeoJSON EPSG:4326** via `ST_Transform` in `getProperty` (`src/lib/properties/search.ts`).
- MapLibre draws that GeoJSON in `src/components/zone-map.tsx`.

## Selection and UI

- Search: `src/components/zone-app.tsx` → `GET /api/properties/search`
- Select: `openProperty(id)` → `GET /api/properties/:id`
- Panel: `PropertyPanel` in `zone-app.tsx` (parcel id, county, address, lot area, source)
- Map click: parcel layer → `onSelect(id)`

## API routes (existing)

| Route | Role |
|-------|------|
| `GET /api/properties/search` | Address / id search |
| `GET /api/properties/[id]` | Detail + geometry |
| `GET /api/parcels?bbox=` | Viewport GeoJSON |
| `GET /api/coverage` | Loaded counties |
| `GET /api/counties` | County list |

## Ingestion (existing)

- `python/ingestion/cli.py` — counties + StratMap ingest
- `python/ingestion/sources/texas.py` — maps situs, area, geometry; stores full row in `raw_payload`
- Travis first load: StratMap zip FIPS 48453

## Zoning placeholders (empty)

- `jurisdiction`, `zoning_dataset`, `zoning_district`, `property_zoning` — created for future **batch** Austin zoning import; not populated yet.

## Enrichment approach (this work)

- **Does not** replace StratMap parcels or change the map.
- On parcel select (Travis / Austin jurisdiction): `GET /api/properties/[id]/enrichment` loads StratMap fields from `source_record`, then **spatial queries** official City of Austin ArcGIS layers (zoning, ordinance, historic, permits) and optional TxGIO building footprints.
- Results cached in Postgres (`property_enrichment_cache`) with TTL to limit repeated ArcGIS calls.

See `docs/austin-enrichment-sources.md` for the source registry.
