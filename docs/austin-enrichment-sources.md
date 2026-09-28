# Austin / Travis enrichment source registry

Date accessed: 2026-09-27 unless noted.

All layers below are queried with the **existing parcel polygon** (EPSG:4326 GeoJSON) and `esriSpatialRelIntersects` unless noted. No commercial APIs.

## Baseline parcel (already loaded)

| Field | Value |
|-------|--------|
| Source | StratMap Land Parcels 2025 |
| Agency | TxGIO + county appraisal districts |
| URL | https://geographic.texas.gov/stratmap/land-parcels |
| Coverage | Travis FIPS 48453 (partial → full ingest) |
| API | Local PostGIS + `source_record.raw_payload` |
| Fields used | Situs, `LEGAL_AREA` / `GIS_AREA`, `YEAR_BUILT`, land use, value fields when present |
| Attribution | CC0-1.0 (TxGIO); not survey-grade |

## City of Austin — base zoning

| Field | Value |
|-------|--------|
| Source | Zoning (`Zoning_1` layer 0) |
| Agency | City of Austin, Geospatial Services – Data Development |
| URL | https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_1/MapServer/0 |
| Coverage | City of Austin + ETJ (layer description) |
| Update frequency | Not stated on service |
| API | ArcGIS REST `query`, max 10,000 features |
| Fields used | `ZONING_ZTYPE`, `ZONING_BASE`, `OBJECTID` |
| Attribution | Acknowledge “City of Austin, Geospatial Services – Data Development” on derived products |

## City of Austin — zoning ordinance polygons

| Field | Value |
|-------|--------|
| Source | Zoning Ordinance (`Zoning_1` layer 3) |
| URL | https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_1/MapServer/3 |
| Information | Ordinance boundary polygons (2001 forward; older gaps documented on layer) |
| Fields used | `ZONING_ORDINANCE_NUMBER`, `ZONING_ORDINANCE_PATH` |
| Attribution | Same as base zoning |

## City of Austin — historic / overlays (`Zoning_3`)

| Layer | ID | Geometry | URL suffix |
|-------|-----|----------|------------|
| Historic Landmarks | 0 | Point | `/MapServer/0` |
| Local Historic Districts | 1 | Polygon | `/MapServer/1` |
| National Register Historic Districts | 2 | Polygon | `/MapServer/2` |

Service: https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_3/MapServer

Fields used: `BUILDING_NAME`, `ADDRESS`, `LANDMARK_ID`, `ZONING_OVERLAY_NAME`, etc. (per layer)

Attribution: Planning / P&Z department (service copyright text)

## City of Austin — permits & plan review

| Layer | ID | Description |
|-------|-----|-------------|
| Building Permits | 0 | Points, 2006+, quarterly update (layer description) |
| Demolition Plan Review (in review) | 1 | |
| Demolition Permits | 2 | |
| Plan Review Cases | 9 | |

Service: https://maps.austintexas.gov/arcgis/rest/services/Shared/Permits/MapServer

Fields used (building permits): `PERMIT_NUMBER`, `ISSUE_DATE`, `WORK_DESCRIPTION`, `TOTAL_SQUARE_FOOTAGE`, `NUMBER_OF_UNITS`, `BUILDING_VALUATION`, status fields

Attribution: City of Austin Development Services Department

## Texas building footprints (optional intersect)

| Field | Value |
|-------|--------|
| Source | FDST Building Footprints |
| URL | https://feature.geographic.texas.gov/arcgis/rest/services/FDST/BuildingFootprints/MapServer/0 |
| Coverage | Texas |
| API | ArcGIS REST query |
| Fields used | Footprint geometry / area attributes when present |
| Attribution | TxGIO, USGS, OSM, MS (service copyright) |
| Limitation | Composite dataset — label as derived footprint sum, not TCAD sqft |

## Travis County TCAD (reference, not primary enrich path)

| Field | Value |
|-------|--------|
| URL | https://gis.traviscountytx.gov/server1/rest/services/Boundaries_and_Jurisdictions/TCAD/MapServer |
| Use | Cross-check only; StratMap remains parcel geometry of record |

## Deferred (documented, not wired in v1)

- Future Land Use / Land Use Inventory — locate current MapServer name before ingest
- ETOD / CapMetro layers
- Impervious cover, contours, COA address points
- Batch download of zoning into `zoning_district` (future importer; live query used first)
