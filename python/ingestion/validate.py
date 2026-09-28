from __future__ import annotations

from shapely.geometry.base import BaseGeometry

TEXAS_BBOX = (-106.66, 25.83, -93.50, 36.50)


def geometry_problems(geom: BaseGeometry | None, lon: float | None, lat: float | None) -> list[str]:
    problems: list[str] = []
    if geom is None:
        problems.append("missing_geometry")
        return problems
    if geom.is_empty:
        problems.append("empty_geometry")
        return problems
    if not geom.is_valid:
        problems.append("invalid_geometry")
    if lon is None or lat is None or not _inside_texas(lon, lat):
        problems.append("geometry_outside_bounds")
    return problems


def _inside_texas(lon: float, lat: float) -> bool:
    min_lon, min_lat, max_lon, max_lat = TEXAS_BBOX
    return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat
