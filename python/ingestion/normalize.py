from __future__ import annotations

import hashlib
import math
import re
from datetime import date
from typing import Any

_NON_ALNUM = re.compile(r"[^A-Z0-9]+")
_SPACE = re.compile(r"\s+")

ALIASES: dict[str, tuple[str, ...]] = {
    "prop_id": ("prop_id",),
    "geo_id": ("geo_id",),
    "legal_area": ("legal_area",),
    "lgl_area_unit": ("lgl_area_unit", "lgl_area_u"),
    "gis_area": ("gis_area",),
    "gis_area_unit": ("gis_area_unit", "gis_area_u"),
    "situs_addr": ("situs_addr",),
    "situs_num": ("situs_num",),
    "situs_stre": ("situs_stre",),
    "situs_st_1": ("situs_st_1",),
    "situs_st_2": ("situs_st_2",),
    "situs_city": ("situs_city",),
    "situs_stat": ("situs_stat",),
    "situs_zip": ("situs_zip",),
    "source": ("source",),
    "date_acq": ("date_acq",),
    "fips": ("fips",),
    "county": ("county",),
    "stat_land_use": ("stat_land_use", "stat_land_"),
    "loc_land_use": ("loc_land_use", "loc_land_u"),
}


def normalize_address(value: str | None) -> str | None:
    if value is None:
        return None
    text = _NON_ALNUM.sub(" ", str(value).upper())
    text = _SPACE.sub(" ", text).strip()
    return text or None


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    return text


def field_map(keys: list[str]) -> dict[str, str]:
    lower = {key.lower(): key for key in keys}
    resolved: dict[str, str] = {}
    for canonical, options in ALIASES.items():
        for option in options:
            actual = lower.get(option.lower())
            if actual is not None:
                resolved[canonical] = actual
                break
    return resolved


def get_field(row: dict[str, Any], mapping: dict[str, str], name: str) -> Any:
    actual = mapping.get(name)
    if actual is None:
        return None
    return row.get(actual)


def parse_date_acq(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, float):
        if math.isnan(value):
            return None
        value = str(int(value))
    elif isinstance(value, int):
        value = str(value)
    digits = re.sub(r"\D", "", str(value).strip())
    try:
        if len(digits) == 8:
            return date(int(digits[0:4]), int(digits[4:6]), int(digits[6:8]))
        if len(digits) == 6:
            return date(int(digits[0:4]), int(digits[4:6]), 1)
    except ValueError:
        return None
    return None


def parse_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def area_is_suspicious(number: float, unit: str | None) -> bool:
    if number <= 0:
        return True
    normalized = (unit or "").strip().lower()
    if normalized in {"acre", "acres", "ac"}:
        return number > 2_000_000
    if normalized in {"sf", "sqft", "sq ft", "square feet", "ft2"}:
        return number > 2_000_000 * 43560
    return False


def build_address(parts: dict[str, str | None]) -> str | None:
    situs = parts.get("situs_addr")
    if situs:
        collapsed = _SPACE.sub(" ", situs.replace(" ,", ",").replace(", ,", ",")).strip(" ,")
        collapsed = re.sub(r"(,\s*)+", ", ", collapsed).strip(" ,")
        return collapsed or None
    street = " ".join(
        piece
        for piece in (parts.get("situs_num"), parts.get("situs_stre"), parts.get("situs_st_1"), parts.get("situs_st_2"))
        if piece
    )
    street = _SPACE.sub(" ", street).strip()
    if not street:
        return None
    tail = " ".join(piece for piece in (parts.get("situs_city"), parts.get("situs_stat"), parts.get("situs_zip")) if piece)
    line = ", ".join(piece for piece in (street, tail) if piece)
    return line or None


def external_id(fips: str, prop_id: str | None, geo_id: str | None, geom_wkb: bytes) -> tuple[str, str, bool]:
    if prop_id:
        return f"{fips}:{prop_id}", prop_id, False
    digest = hashlib.sha256(f"{fips}|{geo_id or ''}|".encode() + geom_wkb).hexdigest()
    return f"{fips}:hash:{digest}", digest, True


def json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, (date,)):
        return value.isoformat()
    if hasattr(value, "item"):
        try:
            return json_safe(value.item())
        except Exception:
            return str(value)
    return value
