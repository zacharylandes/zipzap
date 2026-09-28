CREATE TABLE IF NOT EXISTS property_enrichment_cache (
  property_id bigint PRIMARY KEY REFERENCES property (id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  retrieved_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_enrichment_cache_retrieved_idx
  ON property_enrichment_cache (retrieved_at);
