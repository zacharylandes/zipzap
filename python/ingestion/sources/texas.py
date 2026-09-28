from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path
from typing import Any, Iterator

import pyogrio
import shapely
import shapely.ops
from pyproj import CRS, Transformer
from shapely.geometry.base import BaseGeometry

from ingestion.models import MappedParcel
from ingestion.normalize import (
    area_is_suspicious,
    build_address,
    clean_text,
    external_id,
    field_map,
    get_field,
    json_safe,
    normalize_address,
    parse_date_acq,
    parse_number,
)
from ingestion.validate import geometry_problems

STRATMAP_COLLECTION = "0fa04328-872e-481c-b453-126a74777593"
TARGET_EPSG = 3083


def open_dataset(path: Path) -> tuple[str, str | None]:
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as archive:
            gdbs = sorted({name.split(".gdb/")[0] + ".gdb" for name in archive.namelist() if ".gdb/" in name})
            shps = [name for name in archive.namelist() if name.lower().endswith(".shp")]
        if gdbs:
            gdb = f"/vsizip/{path.resolve()}/{gdbs[0]}"
            try:
                info = pyogrio.read_info(gdb)
                return gdb, info.get("layer_name") or None
            except Exception:
                pass
        if not shps:
            raise FileNotFoundError(f"No shapefile or geodatabase in {path}")
        return f"/vsizip/{path.resolve()}/{shps[0]}", None
    return str(path.resolve()), None


def iter_mapped(path: Path, batch_size: int = 2000) -> Iterator[MappedParcel]:
    dataset, layer = open_dataset(path)
    info = pyogrio.read_info(dataset, **({"layer": layer} if layer else {}))
    total = int(info["features"])
    source_epsg = _epsg(info.get("crs"))
    offset = 0
    while offset < total:
        frame = pyogrio.read_dataframe(
            dataset,
            skip_features=offset,
            max_features=batch_size,
            **({"layer": layer} if layer else {}),
        )
        offset += batch_size
        if frame.empty:
            break
        mapping = field_map(list(frame.columns))
        crs = source_epsg
        if frame.crs is not None:
            crs = frame.crs.to_epsg() or crs
        for _, row in frame.iterrows():
            values = {column: json_safe(row[column]) for column in frame.columns if column != "geometry"}
            geom = row.geometry if "geometry" in frame.columns else None
            yield map_feature(values, geom if isinstance(geom, BaseGeometry) else None, crs, mapping)


def map_feature(
    values: dict[str, Any],
    geom: BaseGeometry | None,
    source_epsg: int | None,
    mapping: dict[str, str] | None = None,
) -> MappedParcel:
    mapping = mapping or field_map(list(values.keys()))
    texts = {name: clean_text(get_field(values, mapping, name)) for name in mapping}
    fips = texts.get("fips") or ""
    prop_id = texts.get("prop_id")
    geo_id = texts.get("geo_id")
    source_wkb = b"" if geom is None else shapely.to_wkb(geom)
    ext_id, parcel_id, derived = external_id(fips or "unknown", prop_id, geo_id, source_wkb)
    state = "TX" if fips.startswith("48") else None
    county = texts.get("county")
    address = build_address(texts)
    city = texts.get("situs_city")
    zip_code = texts.get("situs_zip")
    legal = parse_number(get_field(values, mapping, "legal_area"))
    gis_area = parse_number(get_field(values, mapping, "gis_area"))
    if legal is not None:
        lot_area = legal
        lot_unit = texts.get("lgl_area_unit")
    else:
        lot_area = gis_area
        lot_unit = texts.get("gis_area_unit")
    problems: list[str] = []
    if not prop_id:
        problems.append("missing_identifiers")
    if not fips.startswith("48"):
        problems.append("missing_state")
        state = None
    if not county:
        problems.append("missing_county")
    if not address:
        problems.append("missing_addresses")
    if lot_area is not None and area_is_suspicious(lot_area, lot_unit):
        problems.append("suspicious_lot_area")
        lot_area = None
        lot_unit = None
    if source_epsg is None:
        problems.append("crs_error")

    geom_3083: bytes | None = None
    lon = lat = None
    if geom is not None and source_epsg is not None and not geom.is_empty:
        lon, lat = _lon_lat(geom, source_epsg)
        projected = geom if source_epsg == TARGET_EPSG else _project(geom, source_epsg)
        if projected.geom_type == "Polygon":
            projected = shapely.MultiPolygon([projected])
        if projected.geom_type == "MultiPolygon" and projected.is_valid:
            geom_3083 = shapely.to_wkb(projected)
    problems.extend(geometry_problems(geom, lon, lat))
    if "invalid_geometry" in problems or "crs_error" in problems:
        geom_3083 = None

    raw = {key: json_safe(value) for key, value in values.items()}
    checksum = hashlib.sha256(
        json.dumps(raw, sort_keys=True, default=str).encode() + b"|" + source_wkb
    ).hexdigest()
    identifiers: list[tuple[str, str, str]] = []
    if prop_id:
        identifiers.append(("prop_id", prop_id, "stratmap"))
    elif derived:
        identifiers.append(("derived_hash", parcel_id, "stratmap"))
    if geo_id:
        identifiers.append(("geo_id", geo_id, "stratmap"))

    return MappedParcel(
        external_id=ext_id,
        parcel_id=parcel_id,
        parcel_id_derived=derived,
        geo_id=geo_id,
        fips=fips,
        state=state or "",
        county=county,
        address=address,
        normalized_address=normalize_address(address),
        city=city,
        zip_code=zip_code,
        lot_area=lot_area,
        lot_area_unit=lot_unit if lot_area is not None else None,
        source_attribute=texts.get("source"),
        source_updated_at=parse_date_acq(get_field(values, mapping, "date_acq")),
        source_srid=source_epsg,
        geom_wkb_3083=geom_3083,
        longitude=lon,
        latitude=lat,
        checksum=checksum,
        raw_payload=raw,
        identifiers=identifiers,
        problems=problems,
    )


def _epsg(crs_value: Any) -> int | None:
    if not crs_value:
        return None
    try:
        return CRS.from_user_input(crs_value).to_epsg()
    except Exception:
        return None


def _project(geom: BaseGeometry, source_epsg: int) -> BaseGeometry:
    transformer = Transformer.from_crs(source_epsg, TARGET_EPSG, always_xy=True)
    return shapely.ops.transform(transformer.transform, geom)


def _lon_lat(geom: BaseGeometry, source_epsg: int) -> tuple[float, float]:
    point = geom.centroid
    if source_epsg == 4326:
        return float(point.x), float(point.y)
    transformer = Transformer.from_crs(source_epsg, 4326, always_xy=True)
    lon, lat = transformer.transform(point.x, point.y)
    return float(lon), float(lat)
