from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path

import httpx

from ingestion.base import ingest_parcels
from ingestion.report import IngestReport
from ingestion.sources.county import load_texas_counties
from ingestion.sources.austin_zoning import AUSTIN_ZONING_LAYER, iter_austin_base_zoning
from ingestion.sources.texas import STRATMAP_COLLECTION, iter_mapped
from ingestion.store import DATASET, PostgresStore

RESOURCE_API = "https://api.tnris.org/api/v1/resources/"
DOWNLOAD_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    ),
    "Referer": "https://data.geographic.texas.gov/",
    "Accept": "*/*",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Load Texas parcel and county sources")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("counties")
    ingest = sub.add_parser("ingest")
    ingest.add_argument("--fixture", type=Path)
    ingest.add_argument("--fips", default="48453")
    ingest.add_argument("--report", type=Path, default=Path("data/processed/ingest-report.json"))
    zoning = sub.add_parser("austin-zoning")
    zoning.add_argument("--max-features", type=int, default=0, help="0 = all features")
    sub.add_parser("austin-zoning-link")
    args = parser.parse_args()
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is not set")
    import psycopg

    with psycopg.connect(database_url) as conn:
        store = PostgresStore(conn)
        if args.command == "counties":
            count = load_texas_counties(conn)
            print(f"Counties loaded: {count}")
            return
        if args.command == "austin-zoning-link":
            store = PostgresStore(conn)
            linked = store.refresh_property_zoning_links("48453")
            conn.commit()
            store.mark_austin_zoning_loaded()
            conn.commit()
            print(f"Property-zoning links: {linked}")
            return
        if args.command == "austin-zoning":
            store = PostgresStore(conn)
            jurisdiction_id = store.ensure_austin_jurisdiction()
            dataset_id = store.ensure_zoning_dataset(jurisdiction_id, AUSTIN_ZONING_LAYER)
            store.clear_zoning_districts(jurisdiction_id, "zoning_base")
            loaded = 0
            for external_id, code, base, geom_wkb, attrs in iter_austin_base_zoning():
                if args.max_features and loaded >= args.max_features:
                    break
                object_id = attrs.get("OBJECTID")
                store.insert_zoning_district(
                    jurisdiction_id,
                    dataset_id,
                    int(object_id) if object_id is not None else None,
                    code,
                    base,
                    geom_wkb,
                    attrs,
                )
                loaded += 1
            conn.commit()
            print(f"Austin base zoning districts loaded: {loaded}")
            return
        report = IngestReport()
        if args.fixture:
            path = args.fixture
            county = "Travis"
            fips = "48453"
        else:
            path, fips, county = download_county(args.fips)
        source_id = store.ensure_source(
            county,
            {"dataset": DATASET, "fips": fips, "file": path.name, "sha256": _sha256(path)},
        )

        def counted():
            for record in iter_mapped(path):
                report.records_downloaded += 1
                yield record

        ingest_parcels(counted(), store, report, source_id)
        conn.commit()
        partial = report.invalid_geometries > 0 or report.missing_geometry > 0
        store.mark_county_loaded(fips, partial)
        conn.commit()
        report.write(args.report)
        print(report.render())


def download_county(fips: str) -> tuple[Path, str, str]:
    match = next(item for item in _resources() if f"_{fips}_" in item["resource"])
    url = match["resource"]
    county = match["area_type_name"]
    destination = Path("data/raw/parcels") / Path(url).name
    destination.parent.mkdir(parents=True, exist_ok=True)
    advertised = int(match["filesize"])
    if not destination.exists() or destination.stat().st_size < advertised:
        with httpx.stream("GET", url, headers=DOWNLOAD_HEADERS, follow_redirects=True, timeout=None) as download:
            download.raise_for_status()
            with destination.open("wb") as handle:
                for chunk in download.iter_bytes():
                    handle.write(chunk)
    return destination, fips, county


def _resources():
    url: str | None = RESOURCE_API
    params: dict | None = {"collection_id": STRATMAP_COLLECTION, "limit": 100}
    while url:
        response = httpx.get(url, params=params, headers=DOWNLOAD_HEADERS, timeout=60, follow_redirects=True)
        response.raise_for_status()
        body = response.json()
        yield from body["results"]
        url = body.get("next")
        params = None


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


if __name__ == "__main__":
    main()
