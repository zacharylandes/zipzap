from __future__ import annotations

import zipfile
from pathlib import Path

import httpx
import pyogrio
import shapely
from pyproj import Transformer

TIGER_URL = "https://www2.census.gov/geo/tiger/TIGER2024/COUNTY/tl_2024_us_county.zip"
TIGER_PATH = Path("data/raw/tiger/tl_2024_us_county.zip")

POPULATION_NOTE = "TIGER/Line 2024 county shapefile has no population attribute."
PARCEL_REASON = "No parcel dataset has been ingested for this county."
ZONING_REASON = "No zoning dataset has been ingested for this county."


def download_tiger(path: Path = TIGER_PATH) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 0:
        return path
    with httpx.stream("GET", TIGER_URL, follow_redirects=True, timeout=120) as response:
        response.raise_for_status()
        with path.open("wb") as handle:
            for chunk in response.iter_bytes():
                handle.write(chunk)
    return path


def load_texas_counties(conn, path: Path = TIGER_PATH) -> int:
    download_tiger(path)
    with zipfile.ZipFile(path) as archive:
        shp = next(name for name in archive.namelist() if name.lower().endswith(".shp"))
    dataset = f"/vsizip/{path.resolve()}/{shp}"
    frame = pyogrio.read_dataframe(dataset)
    texas = frame[frame["STATEFP"].astype(str) == "48"]
    transformer = Transformer.from_crs(frame.crs, 3083, always_xy=True)
    loaded = 0
    with conn.cursor() as cur:
        for _, row in texas.iterrows():
            geom = shapely.ops.transform(transformer.transform, row.geometry)
            if geom.geom_type == "Polygon":
                geom = shapely.MultiPolygon([geom])
            fips = str(row["GEOID"])
            cur.execute(
                """
                INSERT INTO county (
                  state, fips, name, geom, population_estimate, population_note,
                  parcel_source_status, parcel_status_reason,
                  zoning_source_status, zoning_status_reason
                ) VALUES (
                  'TX', %s, %s, ST_Multi(ST_SetSRID(ST_GeomFromWKB(%s), 3083)),
                  NULL, %s, 'UNKNOWN', %s, 'UNKNOWN', %s
                )
                ON CONFLICT (state, fips) DO UPDATE SET
                  name = EXCLUDED.name,
                  geom = EXCLUDED.geom,
                  population_note = EXCLUDED.population_note
                """,
                (fips, str(row["NAME"]), shapely.to_wkb(geom), POPULATION_NOTE, PARCEL_REASON, ZONING_REASON),
            )
            loaded += 1
    conn.commit()
    return loaded
