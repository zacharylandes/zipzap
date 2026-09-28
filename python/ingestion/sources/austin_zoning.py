from __future__ import annotations

from typing import Any, Iterator

import shapely
import shapely.ops
from pyproj import Transformer

from ingestion.sources.arcgis import iter_feature_geojson

AUSTIN_ZONING_LAYER = "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_1/MapServer/0"
TARGET_EPSG = 3083
_transformer = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)


def iter_austin_base_zoning() -> Iterator[tuple[str, str | None, str | None, bytes | None, dict[str, Any]]]:
    for feature in iter_feature_geojson(AUSTIN_ZONING_LAYER):
        props = feature.get("properties") or {}
        object_id = props.get("OBJECTID")
        code = _first_str(props, "ZONING_ZTYPE", "ZONING")
        base = _first_str(props, "ZONING_BASE")
        geom_wkb = _feature_wkb(feature.get("geometry"))
        clean = {k: props[k] for k in props if k not in {"SHAPE", "Shape"}}
        external_id = str(object_id) if object_id is not None else code or "unknown"
        yield (external_id, code or base, base, geom_wkb, clean)


def _first_str(props: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = props.get(key)
        if value is None or value == "":
            continue
        return str(value)
    return None


def _feature_wkb(geometry: dict[str, Any] | None) -> bytes | None:
    if not geometry:
        return None
    geom = shapely.geometry.shape(geometry)
    if geom.is_empty:
        return None
    projected = shapely.ops.transform(_transformer.transform, geom)
    if projected.geom_type == "Polygon":
        projected = shapely.MultiPolygon([projected])
    if projected.geom_type != "MultiPolygon" or not projected.is_valid:
        return None
    return shapely.to_wkb(projected)
