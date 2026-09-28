from __future__ import annotations

from typing import Protocol

from ingestion.models import MappedParcel

DATASET = "stratmap-2025-land-parcels"
SOURCE_NAME = "StratMap Land Parcels 2025"
AGENCY = "Texas Geographic Information Office"
SOURCE_URL = "https://geographic.texas.gov/stratmap/land-parcels"
LICENSE = "CC0-1.0"


def _geom_sql(wkb: bytes | None) -> tuple[str, list[bytes]]:
    if wkb is None:
        return "NULL", []
    return "ST_Multi(ST_SetSRID(ST_GeomFromWKB(%s), 3083))", [wkb]


class Store(Protocol):
    def latest_checksums(self, source_id: int) -> dict[str, str]: ...

    def append_source(self, source_id: int, record: MappedParcel) -> None: ...

    def upsert_property(self, source_id: int, record: MappedParcel) -> None: ...


class MemoryStore:
    def __init__(self) -> None:
        self.checksums: dict[str, str] = {}
        self.source_rows: list[MappedParcel] = []
        self.properties: dict[str, MappedParcel] = {}

    def latest_checksums(self, source_id: int) -> dict[str, str]:
        return dict(self.checksums)

    def append_source(self, source_id: int, record: MappedParcel) -> None:
        self.source_rows.append(record)
        self.checksums[record.external_id] = record.checksum

    def upsert_property(self, source_id: int, record: MappedParcel) -> None:
        self.properties[record.external_id] = record


class PostgresStore:
    def __init__(self, conn) -> None:
        import psycopg

        self.conn = conn
        self._json = psycopg.types.json.Jsonb
        self._pending = 0

    def ensure_source(self, county: str, metadata: dict) -> int:
        with self.conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id FROM data_source
                    WHERE source_type = 'parcel' AND metadata->>'dataset' = %s AND county = %s
                    """,
                    (DATASET, county),
                )
                row = cur.fetchone()
                if row:
                    cur.execute(
                        """
                        UPDATE data_source
                        SET retrieved_at = now(), metadata = metadata || %s::jsonb, active = true
                        WHERE id = %s
                        """,
                        (self._json(metadata), row[0]),
                    )
                    return int(row[0])
                cur.execute(
                    """
                    INSERT INTO data_source
                      (name, agency, state, county, url, source_type, format, retrieved_at, license, metadata)
                    VALUES (%s, %s, 'TX', %s, %s, 'parcel', 'shp', now(), %s, %s)
                    RETURNING id
                    """,
                    (SOURCE_NAME, AGENCY, county, SOURCE_URL, LICENSE, self._json({**metadata, "dataset": DATASET})),
                )
                return int(cur.fetchone()[0])

    def latest_checksums(self, source_id: int) -> dict[str, str]:
        with self.conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT DISTINCT ON (external_id) external_id, checksum
                    FROM source_record
                    WHERE data_source_id = %s
                    ORDER BY external_id, id DESC
                    """,
                    (source_id,),
                )
                return {external_id: checksum for external_id, checksum in cur.fetchall()}

    def append_source(self, source_id: int, record: MappedParcel) -> None:
        geom_sql, geom_params = _geom_sql(record.geom_wkb_3083)
        with self.conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO source_record
                  (data_source_id, external_id, raw_payload, geom, source_srid, checksum)
                VALUES (%s, %s, %s, {geom_sql}, %s, %s)
                """,
                (
                    source_id,
                    record.external_id,
                    self._json(record.raw_payload),
                    *geom_params,
                    record.source_srid,
                    record.checksum,
                ),
            )
            self._tick()

    def upsert_property(self, source_id: int, record: MappedParcel) -> None:
        geom_sql, geom_params = _geom_sql(record.geom_wkb_3083)
        with self.conn.cursor() as cur:
            cur.execute(
                f"""
                    INSERT INTO property (
                      state, county, county_fips, parcel_id, source_parcel_id, parcel_id_derived,
                      geo_id, address, normalized_address, city, zip, latitude, longitude,
                      coordinates_derived, lot_area, lot_area_unit, lot_area_derived, geom,
                      source_id, source_dataset, source_updated_at, source_attribute, external_id, retrieved_at
                    ) VALUES (
                      %s, %s, %s, %s, %s, %s,
                      %s, %s, %s, %s, %s, %s, %s,
                      true, %s, %s, false,
                      {geom_sql},
                      %s, %s, %s, %s, %s, now()
                    )
                    ON CONFLICT (source_id, external_id) DO UPDATE SET
                      state = EXCLUDED.state,
                      county = EXCLUDED.county,
                      county_fips = EXCLUDED.county_fips,
                      parcel_id = EXCLUDED.parcel_id,
                      source_parcel_id = EXCLUDED.source_parcel_id,
                      parcel_id_derived = EXCLUDED.parcel_id_derived,
                      geo_id = EXCLUDED.geo_id,
                      address = EXCLUDED.address,
                      normalized_address = EXCLUDED.normalized_address,
                      city = EXCLUDED.city,
                      zip = EXCLUDED.zip,
                      latitude = EXCLUDED.latitude,
                      longitude = EXCLUDED.longitude,
                      lot_area = EXCLUDED.lot_area,
                      lot_area_unit = EXCLUDED.lot_area_unit,
                      geom = EXCLUDED.geom,
                      source_dataset = EXCLUDED.source_dataset,
                      source_updated_at = EXCLUDED.source_updated_at,
                      source_attribute = EXCLUDED.source_attribute,
                      retrieved_at = now(),
                      updated_at = now()
                    RETURNING id
                    """,
                    (
                        record.state,
                        record.county,
                        record.fips,
                        record.parcel_id,
                        record.parcel_id,
                        record.parcel_id_derived,
                        record.geo_id,
                        record.address,
                        record.normalized_address,
                        record.city,
                        record.zip_code,
                        record.latitude,
                        record.longitude,
                        record.lot_area,
                        record.lot_area_unit,
                        *geom_params,
                        source_id,
                        DATASET,
                        record.source_updated_at,
                        record.source_attribute,
                        record.external_id,
                    ),
            )
            property_id = int(cur.fetchone()[0])
            cur.execute("DELETE FROM parcel_identifier WHERE property_id = %s", (property_id,))
            for identifier_type, identifier_value, source in record.identifiers:
                cur.execute(
                    """
                    INSERT INTO parcel_identifier (property_id, identifier_type, identifier_value, source)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (property_id, identifier_type, identifier_value, source),
                )
        self._tick()

    def _tick(self) -> None:
        self._pending += 1
        if self._pending >= 400:
            self.conn.commit()
            self._pending = 0

    def mark_county_loaded(self, fips: str, partial: bool) -> None:
        status = "PARTIAL" if partial else "AVAILABLE"
        reason = (
            "StratMap Land Parcels 2025 loaded with geometry or area warnings. See the ingest report."
            if partial
            else "StratMap Land Parcels 2025 loaded from the TxGIO DataHub county file."
        )
        with self.conn.cursor() as cur:
            cur.execute(
                """
                UPDATE county
                SET parcel_source_status = %s,
                    parcel_status_reason = %s,
                    last_parcel_update = now()
                WHERE state = 'TX' AND fips = %s
                """,
                (status, reason, fips),
            )

    def ensure_austin_jurisdiction(self) -> int:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT id FROM jurisdiction
                WHERE state = 'TX' AND name = 'City of Austin'
                """
            )
            row = cur.fetchone()
            if row:
                return int(row[0])
            cur.execute(
                """
                INSERT INTO jurisdiction (name, jurisdiction_type, county, state)
                VALUES ('City of Austin', 'municipal', 'Travis', 'TX')
                RETURNING id
                """
            )
            return int(cur.fetchone()[0])

    def ensure_zoning_dataset(self, jurisdiction_id: int, source_url: str) -> int:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT id FROM zoning_dataset
                WHERE jurisdiction_id = %s AND source_url = %s
                """,
                (jurisdiction_id, source_url),
            )
            row = cur.fetchone()
            if row:
                cur.execute(
                    "UPDATE zoning_dataset SET retrieved_at = now() WHERE id = %s",
                    (row[0],),
                )
                return int(row[0])
            cur.execute(
                """
                INSERT INTO zoning_dataset (jurisdiction_id, source_url, source_type, retrieved_at)
                VALUES (%s, %s, 'arcgis', now())
                RETURNING id
                """,
                (jurisdiction_id, source_url),
            )
            return int(cur.fetchone()[0])

    def clear_zoning_districts(self, jurisdiction_id: int, layer_key: str) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM zoning_district
                WHERE jurisdiction_id = %s AND layer_key = %s
                """,
                (jurisdiction_id, layer_key),
            )

    def insert_zoning_district(
        self,
        jurisdiction_id: int,
        source_id: int,
        external_object_id: int | None,
        district_code: str | None,
        description: str | None,
        geom_wkb: bytes | None,
        attributes: dict,
        layer_key: str = "zoning_base",
    ) -> None:
        if geom_wkb is None:
            return
        geom_sql, geom_params = _geom_sql(geom_wkb)
        with self.conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO zoning_district (
                  jurisdiction_id, district_code, description, geom, source_id,
                  external_object_id, layer_key, attributes
                ) VALUES (%s, %s, %s, {geom_sql}, %s, %s, %s, %s)
                """,
                (
                    jurisdiction_id,
                    district_code or "UNKNOWN",
                    description,
                    *geom_params,
                    source_id,
                    external_object_id,
                    layer_key,
                    self._json(attributes),
                ),
            )
        self._tick()

    def refresh_property_zoning_links(self, county_fips: str = "48453") -> int:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM property_zoning pz
                USING property p
                WHERE pz.property_id = p.id AND p.county_fips = %s
                """,
                (county_fips,),
            )
            cur.execute(
                """
                INSERT INTO property_zoning (property_id, zoning_district_id, intersection_area, intersection_percentage)
                SELECT
                  p.id,
                  zd.id,
                  ST_Area(ST_Intersection(p.geom, zd.geom)),
                  CASE
                    WHEN ST_Area(p.geom) > 0
                    THEN 100.0 * ST_Area(ST_Intersection(p.geom, zd.geom)) / ST_Area(p.geom)
                    ELSE NULL
                  END
                FROM property p
                JOIN zoning_district zd ON zd.layer_key = 'zoning_base'
                WHERE p.county_fips = %s
                  AND p.geom IS NOT NULL
                  AND zd.geom IS NOT NULL
                  AND ST_Intersects(p.geom, zd.geom)
                ON CONFLICT DO NOTHING
                """,
                (county_fips,),
            )
            cur.execute("SELECT count(*) FROM property_zoning")
            return int(cur.fetchone()[0])

    def mark_austin_zoning_loaded(self) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                UPDATE county
                SET zoning_source_status = 'AVAILABLE',
                    zoning_status_reason = 'City of Austin base zoning imported and linked to Travis parcels.',
                    last_zoning_update = now()
                WHERE state = 'TX' AND fips = '48453'
                """
            )
