# Data sources

Date accessed for every record below: 2026-09-27.

Texas has no single mandated parcel schema. County appraisal districts create the geometry. The Texas Geographic Information Office (TxGIO, formerly TNRIS) compiles many of those county files into StratMap. This project uses StratMap 2025 as the statewide baseline and county files as newer overrides. Commercial parcel vendors are not used.

The resources API for the 2025 land-parcel collection returned `count: 254` on this date, one county zip each. That is not a claim that every attribute is populated in every county.

## StratMap Land Parcels 2025

- Source name: StratMap Land Parcels 2025
- Government agency: Texas Geographic Information Office. Parcel geometry is produced by county appraisal districts or their vendors. TxGIO compiles and does not edit the geometry. The 2025 collection text says translation was done by BIS Consultants.
- URL: https://geographic.texas.gov/stratmap/land-parcels
- Collection: https://data.geographic.texas.gov/collection/0fa04328-872e-481c-b453-126a74777593
- Collection id: `0fa04328-872e-481c-b453-126a74777593`
- Catalog API: https://api.tnris.org/api/v1/collections/?name=Land%20Parcels
- Resource API: https://api.tnris.org/api/v1/resources/?collection_id=0fa04328-872e-481c-b453-126a74777593
- Feature service (spot checks only): https://feature.geographic.texas.gov/arcgis/rest/services/Parcels/stratmap_land_parcels_48_most_recent/MapServer/0
- Geographic coverage: Texas counties published in the 2025 collection. The resource list had 254 county zips on 2026-09-27.
- Data format: each county zip contains a file geodatabase, a shapefile, and metadata.
- API/download mechanism: DataHub file URL from the resources API. Travis County file, 344,289,869 bytes: https://data.geographic.texas.gov/0fa04328-872e-481c-b453-126a74777593/resources/stratmap25-landparcels_48453_lp.zip
- Update frequency: TxGIO says it tries to refresh annually. The month in the inner filename is `YYYYMM`. Collection acquisition date 2025-06-01. Publication date 2025-09-11.
- Identifier fields: `Prop_ID`, `GEO_ID`, plus `FIPS`. `Prop_ID` and `GEO_ID` are not unique statewide. The stable key is county FIPS plus `Prop_ID`.
- Geometry fields: shapefile `shape` / geodatabase geometry. Inspected shapefile `.prj` for Stephens County is `GCS_WGS_1984` (EPSG:4326). The feature service is EPSG:3857. Read `.prj` per file.
- Important attributes: situs address parts, `LEGAL_AREA` and `GIS_AREA` with unit fields, `STAT_LAND_` / `LOC_LAND_U`, land/improvement/market value, `YEAR_BUILT`, `TAX_YEAR`, `SOURCE`, `DATE_ACQ`, `COUNTY`.
- License/usage restrictions: TxGIO catalog record `license_abbreviation` is `CC0-1.0` (https://spdx.org/licenses/CC0-1.0.html). TxGIO also says the parcels are not survey grade, not for legal use, published as-is, and intended as basemap and cartographic data.
- Limitations:
  - A download without a browser `User-Agent` and `Referer: https://data.geographic.texas.gov/` returned HTTP 403 on 2026-09-27. See https://github.com/TNRIS/go-bulk-downloader/issues/40.
  - The feature service allows 2,000 records per request and a minimum scale of 1:500,000. It is not the bulk load path.
  - In the Stephens County shapefile inspected on this date, `Prop_ID` is width 10, while the map service field is width 17. `STAT_LAND_` and `LOC_LAND_U` are truncated names. `LEGAL_AREA` is a float and `LGL_AREA_U` was `Acres`. `DATE_ACQ` was `YYYYMMDD` (`20250201`). `SITUS_STRE` was empty on the sampled row and `SITUS_ADDR` contained placeholder commas (`15715  FM 1853 , , TX`). Other counties can differ.
  - Situs fields are often blank. There is no geocoder in this system, so a blank situs cannot be searched by street.
  - Owner name stays in the raw payload and is not shown on the parcel panel.

## Dallas Central Appraisal District GIS

- Source name: DCAD GIS parcels
- Government agency: Dallas Central Appraisal District
- URL: https://www.dallascad.org/GISDataProducts.aspx
- Geographic coverage: Dallas County
- Data format: shapefile inside zip. The page says the 2026 parcel zip was renamed from `PARCEL.zip` to `PARCEL_GEOM.zip`.
- API/download mechanism: files linked from the data-products page. Query layer: https://maps.dcad.org/prdwa/rest/services/Property/ParcelQuery/MapServer/4 (`PARCELID`, `LOWPARCELID`).
- Update frequency: the page describes current-year parcels and historic certified years. It does not state a fixed calendar interval.
- Identifier fields: `PARCELID`, `LOWPARCELID`. Account numbers and GIS parcel ids are different; see https://www.dallascad.org/PARCEL_GEOM.pdf.
- Geometry fields: parcel polygons.
- Important attributes: parcel geometry. Appraisal values are a separate roll download that joins on the parcel id.
- License/usage restrictions: DCAD says the files are informational and not a survey, and not for legal, engineering, or surveying use.
- Limitations: not loaded in the first ingest. Schema is not the StratMap schema. Use as a Dallas override after Travis search works.

## Harris Central Appraisal District GIS

- Source name: HCAD GIS Public
- Government agency: Harris Central Appraisal District
- URL: https://hcad.org/pdata/pdata-gis-downloads.html
- Field dictionary: https://hcad.org/assets/uploads/pdf/resources/2026/GIS-ReadMeV2-2.pdf
- Geographic coverage: Harris County
- Data format: shapefile or file geodatabase, zipped as "GIS Public"
- API/download mechanism: download from the GIS downloads page. The district says it does not provide technical support for the files.
- Update frequency: the downloads page says GIS data on that page updates quarterly.
- Identifier fields: `HCAD_NUM`, `LOWPARCELI`
- Geometry fields: parcel polygons. The readme says boundaries are approximate.
- Important attributes: site address parts (`LocNum` and related fields), stated area, owner. Confirm names against the readme at ingest time.
- License/usage restrictions: informational, not a survey, not for legal, engineering, or surveying use.
- Limitations: not loaded in the first ingest. Houston has no conventional citywide zoning; a later zoning status for these parcels is `UNZONED`, not a fabricated district.

## Travis County parcel service

- Source name: TCAD parcels (Travis County TNR)
- Government agency: Travis County Transportation and Natural Resources, data from the Travis Central Appraisal District
- URL: https://gis.traviscountytx.gov/server1/rest/services/Boundaries_and_Jurisdictions/TCAD/MapServer
- Geographic coverage: Travis County
- Data format: ArcGIS polygon feature layer
- API/download mechanism: MapServer query. Max record count 1,000 on the service inspected. Source CRS EPSG:2277 (Texas South Central, US feet).
- Update frequency: the service description says Travis County TNR assembles and updates it monthly from TCAD.
- Identifier fields: the layer is published for query. Do not assume StratMap `Prop_ID` names; read the live field list at ingest time.
- Geometry fields: parcel polygons.
- Important attributes: owner, acreage, values, and year-built style fields are present on the layer. Read current aliases before mapping.
- License/usage restrictions: copyright text on the service is "Travis Central Appraisal District". The TCAD shapefile itself is a $4 records request (https://traviscad.org/faq-items/can-i-get-electronic-shape-files/) and is not the free ingest path.
- Limitations: backup for checking StratMap in Travis County, not the first load. The first load is the StratMap Travis zip.

## Census TIGER/Line counties, 2024

- Source name: TIGER/Line county boundaries, 2024
- Government agency: U.S. Census Bureau
- URL: https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html
- File: https://www2.census.gov/geo/tiger/TIGER2024/COUNTY/tl_2024_us_county.zip
- Geographic coverage: United States counties. This load keeps `STATEFP = 48`.
- Data format: shapefile, 83,913,260 bytes, last-modified Fri, 27 Jun 2025 20:01:24 GMT
- API/download mechanism: HTTPS zip
- Update frequency: annual TIGER/Line vintage
- Identifier fields: `GEOID` (state + county FIPS), `COUNTYFP`, `NAME`
- Geometry fields: county polygons. TIGER county files use NAD83 geographic coordinates.
- Important attributes: county name. This vintage does not include population.
- License/usage restrictions: Census TIGER/Line data is published for public use. See the program page.
- Limitations: cartographic boundaries for joins and "is this point in the county" checks. Not a survey of parcel lines. Population is left empty with the reason that this file has no population attribute.

## StratMap address points

- Source name: StratMap address points
- Government agency: Texas Geographic Information Office, compiled from 9-1-1 entities
- URL: https://geographic.texas.gov/stratmap/address-points
- Geographic coverage: Texas, where a 9-1-1 authority contributed points
- Data format: DataHub download. A published map service also exists at https://feature.geographic.texas.gov/arcgis/rest/services/Address_Points/stratmap21_address_points_48/MapServer/0
- API/download mechanism: TxGIO DataHub
- Update frequency: TxGIO describes an annual statewide program. Coverage and currency vary by region.
- Identifier fields: site address components (number, street, community, postal code). Read the current schema before a join.
- Geometry fields: points
- Important attributes: house number, street name, postal community, postal code
- License/usage restrictions: TxGIO says the statewide file is free and that TxGIO does not edit the points.
- Limitations: not ingested yet. Parcel situs remains the address used by search.

## Texas building footprints

- Source name: Texas building footprints (FDST)
- Government agency: Texas Geographic Information Office service. Copyright text also names USGS, OSM, and MS.
- URL: https://feature.geographic.texas.gov/arcgis/rest/services/FDST/BuildingFootprints/MapServer
- Geographic coverage: Texas
- Data format: ArcGIS polygon layers, including "Texas Building Footprints"
- API/download mechanism: MapServer. Max record count 4,000 on the service inspected.
- Update frequency: not stated on the service description inspected.
- Identifier fields: read the layer fields at ingest time. Do not assume a parcel id.
- Geometry fields: building polygons. Service CRS EPSG:3857.
- Important attributes: footprint geometry. Flood layers on the same service add depth and are a different dataset.
- License/usage restrictions: copyright text is "Texas Geographic Information Office, USGS, OSM, MS".
- Limitations: not ingested. The mix of government and non-government inputs means a footprint area must be labeled as a composite, not as a county measurement.

## City of Austin base zoning

- Source name: City of Austin zoning (`Zoning_1` / Zoning)
- Government agency: City of Austin, Geospatial Services – Data Development
- URL: https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_1/MapServer/0
- Open-data catalog entry for zoning ordinances (a different layer from base districts): https://data.austintexas.gov/Locations-and-Maps/Zoning-Ordinance/xt8n-xrjg
- Geographic coverage: the layer description says zoning classification boundaries in the City of Austin and surrounding counties.
- Data format: polygon feature layer
- API/download mechanism: ArcGIS query. Max record count 10,000. Supported formats include JSON, geoJSON, and PBF.
- Update frequency: not stated on the layer page inspected.
- Identifier fields: `ZONING_ZTYPE`, `ZONING_BASE` (coded values such as AG, AV, CBD)
- Geometry fields: zoning polygons. Source CRS EPSG:2277.
- Important attributes: base zoning code and full zoning string
- License/usage restrictions: the layer asks for acknowledgment of "City of Austin, Geospatial Services – Data Development" on derived products.
- Limitations: not ingested in the first milestone. Chosen as the first zoning plugin because it is one official base-district polygon layer with coded values, a public query API, and it covers the same county as the first parcel load. Related overlay services (`Zoning_2`, `Zoning_3`, `Zoning_4`) are separate and are not this layer.

## City of Dallas zoning

- Source name: City of Dallas zoning
- Government agency: City of Dallas Sustainable Development and Construction GIS
- URL: https://gis.dallascityhall.com/arcgis/rest/services/sdc_public/Zoning/MapServer
- Geographic coverage: Dallas
- Data format: multi-layer MapServer. Layers include deed restrictions and planned-development subdistricts, not one base polygon only.
- API/download mechanism: ArcGIS query. Service CRS EPSG:2276. The service minimum scale inspected was 1:15,000.
- Update frequency: not stated on the service page inspected.
- Identifier fields: vary by layer. Do not reuse Austin field names.
- Geometry fields: polygons
- Important attributes: zoning district, planned development, overlays
- License/usage restrictions: copyright text is "City of Dallas Sustainable Development & Construction GIS".
- Limitations: second zoning jurisdiction, after Austin. Not ingested yet. More layers than Austin, so it is a separate importer.
