ALTER TABLE zoning_district
  ADD COLUMN IF NOT EXISTS external_object_id bigint,
  ADD COLUMN IF NOT EXISTS layer_key text NOT NULL DEFAULT 'zoning_base',
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS zoning_district_layer_object_uidx
  ON zoning_district (jurisdiction_id, layer_key, external_object_id)
  WHERE external_object_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS property_zoning_property_idx ON property_zoning (property_id);
