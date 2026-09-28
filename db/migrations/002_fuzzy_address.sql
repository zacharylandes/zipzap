CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS property_norm_addr_trgm_idx
  ON property USING gin (normalized_address gin_trgm_ops);
