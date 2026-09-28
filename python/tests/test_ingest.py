import shapely
from shapely.geometry import Point, Polygon

from ingestion.base import classify, ingest_parcels
from ingestion.normalize import normalize_address, parse_date_acq
from ingestion.report import IngestReport
from ingestion.sources.texas import map_feature
from ingestion.store import MemoryStore


def square(lon: float, lat: float, size: float = 0.001) -> Polygon:
    return Polygon(
        [
            (lon, lat),
            (lon + size, lat),
            (lon + size, lat + size),
            (lon, lat + size),
            (lon, lat),
        ]
    )


def row(**overrides):
    values = {
        "Prop_ID": "100001",
        "GEO_ID": "GEO-100001",
        "SITUS_ADDR": "100 Congress Ave, Austin, TX 78701",
        "SITUS_CITY": "AUSTIN",
        "SITUS_ZIP": "78701",
        "LEGAL_AREA": 0.25,
        "LGL_AREA_U": "Acres",
        "FIPS": "48453",
        "COUNTY": "TRAVIS",
        "SOURCE": "TRAVIS CENTRAL APPRAISAL DISTRICT",
        "DATE_ACQ": 20250201,
    }
    values.update(overrides)
    return values


def test_normalize_address_collapses_placeholder_commas():
    assert normalize_address("15715  FM 1853 , , TX") == "15715 FM 1853 TX"


def test_date_acq_yyyymmdd():
    assert parse_date_acq(20250201).isoformat() == "2025-02-01"


def test_crs_conversion_puts_austin_in_texas_albers():
    mapped = map_feature(row(), square(-97.7435, 30.2645), 4326)
    assert mapped.source_srid == 4326
    assert mapped.geom_wkb_3083 is not None
    geom = shapely.from_wkb(mapped.geom_wkb_3083)
    assert geom.centroid.x > 1_000_000
    assert geom.centroid.y > 6_500_000
    assert mapped.coordinates_derived if False else mapped.latitude is not None
    assert abs(mapped.latitude - 30.265) < 0.01
    assert abs(mapped.longitude + 97.743) < 0.01


def test_invalid_geometry_is_logged_and_not_stored():
    bowtie = Polygon(
        [
            (-97.75, 30.27),
            (-97.749, 30.271),
            (-97.75, 30.271),
            (-97.749, 30.27),
            (-97.75, 30.27),
        ]
    )
    mapped = map_feature(row(Prop_ID="100009"), bowtie, 4326)
    assert "invalid_geometry" in mapped.problems
    assert mapped.geom_wkb_3083 is None


def test_missing_address_and_suspicious_area_are_logged():
    mapped = map_feature(
        row(Prop_ID="100010", SITUS_ADDR=None, LEGAL_AREA=-5, GEO_ID="GEO-10"),
        square(-97.74, 30.26),
        4326,
    )
    assert "missing_addresses" in mapped.problems
    assert "suspicious_lot_area" in mapped.problems
    assert mapped.lot_area is None
    assert mapped.raw_payload["LEGAL_AREA"] == -5


def test_missing_prop_id_uses_stable_hash():
    geom = square(-97.74, 30.26)
    first = map_feature(row(Prop_ID=None, GEO_ID="GEO-X"), geom, 4326)
    second = map_feature(row(Prop_ID=None, GEO_ID="GEO-X"), geom, 4326)
    assert first.parcel_id_derived is True
    assert first.external_id == second.external_id
    assert first.identifiers[0][0] == "derived_hash"


def test_ingest_is_idempotent_and_updates_on_change():
    store = MemoryStore()
    report = IngestReport()
    feature = map_feature(row(), square(-97.7435, 30.2645), 4326)
    ingest_parcels([feature], store, report, 1)
    again = IngestReport()
    ingest_parcels([feature], store, again, 1)
    assert report.records_inserted == 1
    assert again.records_unchanged == 1
    assert len(store.properties) == 1
    assert len(store.source_rows) == 1

    changed = map_feature(row(SITUS_ADDR="101 Congress Ave, Austin, TX 78701"), square(-97.7435, 30.2645), 4326)
    updated = IngestReport()
    ingest_parcels([changed], store, updated, 1)
    assert updated.records_updated == 1
    assert store.properties[feature.external_id].address.startswith("101")
    assert len(store.source_rows) == 2


def test_duplicate_identifier_does_not_create_a_second_property():
    store = MemoryStore()
    report = IngestReport()
    first = map_feature(row(), square(-97.7435, 30.2645), 4326)
    second = map_feature(row(SITUS_ADDR="100 Congress Ave Unit B, Austin, TX 78701"), square(-97.742, 30.264), 4326)
    ingest_parcels([first, second], store, report, 1)
    assert report.duplicate_identifiers == 1
    assert len(store.properties) == 1
    assert store.properties[first.external_id].address.startswith("100 Congress Ave,")


def test_spatial_intersection_and_point_in_polygon():
    first = shapely.from_wkb(map_feature(row(), square(-97.7435, 30.2645), 4326).geom_wkb_3083)
    second = shapely.from_wkb(
        map_feature(row(Prop_ID="100002"), square(-97.7432, 30.2647), 4326).geom_wkb_3083
    )
    overlap = first.intersection(second)
    assert overlap.area > 0
    assert first.contains(first.centroid)
    assert not first.contains(Point(0, 0))


def test_county_filter_and_provenance():
    store = MemoryStore()
    travis = map_feature(row(), square(-97.7435, 30.2645), 4326)
    other = map_feature(row(Prop_ID="200001", FIPS="48113", COUNTY="DALLAS"), square(-96.80, 32.78), 4326)
    ingest_parcels([travis, other], store, IngestReport(), 1)
    travis_only = [item for item in store.properties.values() if item.county == "TRAVIS"]
    assert len(travis_only) == 1
    assert travis_only[0].source_attribute == "TRAVIS CENTRAL APPRAISAL DISTRICT"
    assert travis_only[0].raw_payload["SOURCE"] == "TRAVIS CENTRAL APPRAISAL DISTRICT"
    assert classify(None, "abc") == "insert"
    assert classify("abc", "abc") == "unchanged"
    assert classify("abc", "def") == "update"


def test_geometry_outside_texas_is_logged():
    mapped = map_feature(row(Prop_ID="100099"), square(-97.0, 40.0), 4326)
    assert "geometry_outside_bounds" in mapped.problems
    assert mapped.geom_wkb_3083 is not None
