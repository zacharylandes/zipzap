# Architecture

Texas Property Intelligence answers, for a loaded parcel: what the public source says is there, which county it is in, and where that fact came from. It does not invent a zoning rule, a geocode, or a development yield.

The app lives in this Next.js repo. `/` and `/calc` stay the house-search product. `/zone` is the parcel search.

## Layers

```text
raw source  ->  normalized property  ->  derived metrics  ->  /zone and the API
```

Raw rows are append-only. A second ingest inserts a new `source_record` only when the checksum changes. The normalized `property` row is upserted on `(source_id, external_id)`. Derived values are stored only with a flag, and the panel does not present them as government facts. Lot area is the source number and the source unit. This load does not convert acres to square feet.

`state`, `county`, `jurisdiction`, and `source_dataset` are columns. Texas is the first `state` value, not a branch in the schema.

## Tables

`data_source` is the dataset: name, agency, state, county, url, source type, format, retrieval time, last source update, license, metadata, active.

`source_record` is one retrieved feature: `data_source_id`, `external_id`, `raw_payload`, geometry in EPSG:3083, `source_srid`, `retrieved_at`, `checksum`. Owner names stay here and are not copied onto the panel.

`county` is one county: `state`, `fips`, `name`, geometry, `population_estimate`, parcel status, zoning status, reasons, and last update times. A missing fact has a reason. It is not a bare null. Population is null because the TIGER/Line county file has no population attribute, and that sentence is stored in `population_note`.

`property` is the normalized parcel: ids, address, normalized address, city, zip, lot area and unit, `lot_area_derived`, geometry, source id, `source_dataset`, source update date, retrieval time. `latitude` and `longitude` are the centroid transformed to EPSG:4326 and `coordinates_derived` is true. `zoning_status` starts at `UNKNOWN` with a reason. Allowed statuses later: `ZONED`, `UNZONED`, `UNKNOWN`, `SPECIAL_REGULATION`, `OTHER`.

`parcel_identifier` stores every id the source actually has: `prop_id`, `geo_id`, and `derived_hash` when `Prop_ID` is blank. The hash is SHA-256 of FIPS, `GEO_ID`, and the source geometry WKB. It is not a random UUID.

`jurisdiction`, `zoning_dataset`, `zoning_district`, and `property_zoning` exist so Austin can be added as a separate importer. They are empty in this milestone. Houston parcels, once loaded, can be `UNZONED` without a fake district.

## CRS and spatial queries

Calculations use EPSG:3083, NAD83 / Texas Centric Albers Equal Area, metres. The source SRID is kept on `source_record`. MapLibre receives EPSG:4326 transformed at read time. Parcel geometry has a GiST index.

The API rejects a parcel request without a bounding box and refuses a box wider or taller than 0.2 degrees. Page size defaults to 200 and caps at 300.

Validation logs invalid, empty, and out-of-bounds geometry. It does not run make-valid. Suspicious lot areas are logged and left null on the normalized row. The original text stays in `raw_payload`.

## Address search

`GET /api/properties/search?q=` reads Postgres only. There is no geocoder and no live county request.

Normalization is shared by ingest and search: uppercase, drop characters that are not letters or digits, collapse whitespace. Search also strips trailing city, state, and ZIP from the query so sparse StratMap situs strings still match.

- Exact normalized address, then exact parcel id or `geo_id`, then address prefix, then city, then county, then fuzzy match via Postgres `pg_trgm` (`similarity` / `word_similarity`) when the query includes a street number.
- One hit opens the parcel on the map.
- Several hits show a list. The page size defaults to 20 and caps at 50.
- No hit on situs text returns an empty list unless the query looks like a street address with a number: then the U.S. Census geocoder (no API key) locates the point and Travis parcels intersecting a 20 m buffer are returned. Those matches are labeled as geocode + geometry, because StratMap situs is often blank (e.g. only `TX 78704`).
- Otherwise no hit. The page says the address was not found.
- The first loaded county is Travis (FIPS 48453) from StratMap. Dallas and Harris are later overrides.
- A blank or truncated situs cannot match. The Stephens sample left `SITUS_STRE` empty. That stays a missing address, not a repaired one.

`GET /api/properties/:id` returns the panel fields, provenance, and GeoJSON in EPSG:4326.

The panel shows parcel id, county, address, lot area with the source unit, source agency, and retrieval date. A hashed parcel id is labeled derived. Lot area that was not in the source is "Not in source".

## Provenance

Each property points at `data_source` (agency, url, license) and at the checksummed `source_record`. The UI line is the agency name and the retrieval date. For StratMap, the county `SOURCE` attribute is included when the file has it, as the appraisal district named in that field, compiled by TxGIO.

## Code layout

- `src/app/zone` and `src/components/zone-*.tsx` — search, panel, map
- `src/app/api/properties`, `src/app/api/parcels`, `src/app/api/counties`, `src/app/api/coverage`
- `src/lib/db`, `src/lib/properties`
- `python/ingestion` — download, checksum, raw insert, mapping, validation, CRS, upsert, report
- `db/migrations` — PostGIS schema
- `docker-compose.yml` — PostGIS and the Next.js app

Host Postgres on this machine already uses port 5432. Local Homebrew may also bind 5433. Compose publishes PostGIS on port 5434.

## Local development

```bash
cp .env.example .env
make setup
make db
make migrate
make seed
make test
make dev
```

`make seed` loads TIGER Texas counties and the committed Travis fixture. `make ingest` downloads the StratMap 2025 Travis zip and loads it. Running either ingest twice does not duplicate properties.

`docker compose up` starts PostGIS and the Next.js app. The app container uses `DATABASE_URL=postgres://zone:zone@db:5432/zone`. Ingest still runs on the host with `make ingest` so a 344 MB county file is not downloaded on every boot.

Open http://localhost:3000/zone.

## Austin parcel enrichment (Travis)

Selecting a parcel calls `GET /api/properties/:id/enrichment`. StratMap CAMA fields come from `source_record.raw_payload`. Zoning, overlays, planning layers, permits, COA planimetrics, and TxGIO footprints are intersected live against official City of Austin / TxGIO ArcGIS REST services (see `docs/austin-enrichment-sources.md`). Results cache in `property_enrichment_cache` for six hours.

Optional batch path: `make austin-zoning` loads base zoning polygons into `zoning_district`; `make austin-zoning-link` fills `property_zoning` with PostGIS intersection areas for Travis parcels.

## After Travis search works

Dallas CAD and Harris CAD overrides, then Dallas zoning. Statewide coverage percentages and geocoding remain out of scope. No LLM.
