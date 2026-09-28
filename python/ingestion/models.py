from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any


@dataclass
class MappedParcel:
    external_id: str
    parcel_id: str
    parcel_id_derived: bool
    geo_id: str | None
    fips: str
    state: str
    county: str | None
    address: str | None
    normalized_address: str | None
    city: str | None
    zip_code: str | None
    lot_area: float | None
    lot_area_unit: str | None
    source_attribute: str | None
    source_updated_at: date | None
    source_srid: int | None
    geom_wkb_3083: bytes | None
    longitude: float | None
    latitude: float | None
    checksum: str
    raw_payload: dict[str, Any]
    identifiers: list[tuple[str, str, str]] = field(default_factory=list)
    problems: list[str] = field(default_factory=list)
