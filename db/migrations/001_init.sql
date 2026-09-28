CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS data_source (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  agency text NOT NULL,
  state text NOT NULL,
  county text,
  url text NOT NULL,
  source_type text NOT NULL,
  format text NOT NULL,
  retrieved_at timestamptz,
  last_source_update date,
  license text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_record (
  id bigserial PRIMARY KEY,
  data_source_id bigint NOT NULL REFERENCES data_source (id),
  external_id text NOT NULL,
  raw_payload jsonb NOT NULL,
  geom geometry(MultiPolygon, 3083),
  source_srid integer,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  checksum text NOT NULL
);

CREATE INDEX IF NOT EXISTS source_record_external_idx
  ON source_record (data_source_id, external_id, id DESC);
CREATE INDEX IF NOT EXISTS source_record_geom_gix
  ON source_record USING GIST (geom);

CREATE TABLE IF NOT EXISTS county (
  id bigserial PRIMARY KEY,
  state text NOT NULL,
  fips text NOT NULL,
  name text NOT NULL,
  geom geometry(MultiPolygon, 3083),
  population_estimate integer,
  population_note text NOT NULL,
  parcel_source_status text NOT NULL DEFAULT 'UNKNOWN',
  parcel_status_reason text NOT NULL,
  zoning_source_status text NOT NULL DEFAULT 'UNKNOWN',
  zoning_status_reason text NOT NULL,
  last_parcel_update timestamptz,
  last_zoning_update timestamptz,
  UNIQUE (state, fips),
  CONSTRAINT county_parcel_status_chk CHECK (
    parcel_source_status IN ('AVAILABLE', 'PARTIAL', 'MISSING', 'UNKNOWN')
  ),
  CONSTRAINT county_zoning_status_chk CHECK (
    zoning_source_status IN ('AVAILABLE', 'PARTIAL', 'MISSING', 'UNKNOWN')
  )
);

CREATE INDEX IF NOT EXISTS county_geom_gix ON county USING GIST (geom);

CREATE TABLE IF NOT EXISTS property (
  id bigserial PRIMARY KEY,
  state text NOT NULL,
  county text NOT NULL,
  county_fips text NOT NULL,
  parcel_id text NOT NULL,
  source_parcel_id text NOT NULL,
  parcel_id_derived boolean NOT NULL DEFAULT false,
  geo_id text,
  address text,
  normalized_address text,
  city text,
  zip text,
  latitude double precision,
  longitude double precision,
  coordinates_derived boolean NOT NULL DEFAULT true,
  lot_area numeric,
  lot_area_unit text,
  lot_area_derived boolean NOT NULL DEFAULT false,
  geom geometry(MultiPolygon, 3083),
  source_id bigint NOT NULL REFERENCES data_source (id),
  source_dataset text NOT NULL,
  source_updated_at date,
  source_attribute text,
  external_id text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  zoning_status text NOT NULL DEFAULT 'UNKNOWN',
  zoning_status_reason text NOT NULL DEFAULT 'No zoning dataset has been intersected with this parcel.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id),
  CONSTRAINT property_zoning_status_chk CHECK (
    zoning_status IN ('ZONED', 'UNZONED', 'UNKNOWN', 'SPECIAL_REGULATION', 'OTHER')
  )
);

CREATE INDEX IF NOT EXISTS property_geom_gix ON property USING GIST (geom);
CREATE INDEX IF NOT EXISTS property_norm_addr_idx
  ON property (normalized_address text_pattern_ops);
CREATE INDEX IF NOT EXISTS property_parcel_idx ON property (county_fips, parcel_id);
CREATE INDEX IF NOT EXISTS property_city_idx ON property (upper(city));
CREATE INDEX IF NOT EXISTS property_county_idx ON property (upper(county));

CREATE TABLE IF NOT EXISTS parcel_identifier (
  id bigserial PRIMARY KEY,
  property_id bigint NOT NULL REFERENCES property (id) ON DELETE CASCADE,
  identifier_type text NOT NULL,
  identifier_value text NOT NULL,
  source text NOT NULL,
  UNIQUE (property_id, identifier_type, identifier_value, source)
);

CREATE INDEX IF NOT EXISTS parcel_identifier_value_idx
  ON parcel_identifier (identifier_value);

CREATE TABLE IF NOT EXISTS jurisdiction (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  jurisdiction_type text NOT NULL,
  county text,
  state text NOT NULL,
  geom geometry(MultiPolygon, 3083)
);

CREATE TABLE IF NOT EXISTS zoning_dataset (
  id bigserial PRIMARY KEY,
  jurisdiction_id bigint NOT NULL REFERENCES jurisdiction (id),
  source_url text NOT NULL,
  source_type text NOT NULL,
  retrieved_at timestamptz,
  last_updated date
);

CREATE TABLE IF NOT EXISTS zoning_district (
  id bigserial PRIMARY KEY,
  jurisdiction_id bigint NOT NULL REFERENCES jurisdiction (id),
  district_code text NOT NULL,
  description text,
  geom geometry(MultiPolygon, 3083),
  source_id bigint REFERENCES zoning_dataset (id)
);

CREATE INDEX IF NOT EXISTS zoning_district_geom_gix
  ON zoning_district USING GIST (geom);

CREATE TABLE IF NOT EXISTS property_zoning (
  property_id bigint NOT NULL REFERENCES property (id) ON DELETE CASCADE,
  zoning_district_id bigint NOT NULL REFERENCES zoning_district (id),
  intersection_area double precision,
  intersection_percentage double precision,
  PRIMARY KEY (property_id, zoning_district_id)
);
