from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class IngestReport:
    records_downloaded: int = 0
    records_parsed: int = 0
    records_inserted: int = 0
    records_updated: int = 0
    records_unchanged: int = 0
    invalid_geometries: int = 0
    duplicate_identifiers: int = 0
    missing_identifiers: int = 0
    missing_addresses: int = 0
    missing_geometry: int = 0
    suspicious_lot_areas: int = 0
    geometry_outside_bounds: int = 0
    missing_county: int = 0
    missing_state: int = 0
    errors: list[str] = field(default_factory=list)

    def render(self) -> str:
        lines = [
            f"Records downloaded: {self.records_downloaded}",
            f"Records parsed: {self.records_parsed}",
            f"Records inserted: {self.records_inserted}",
            f"Records updated: {self.records_updated}",
            f"Records unchanged: {self.records_unchanged}",
            f"Invalid geometries: {self.invalid_geometries}",
            f"Duplicate identifiers: {self.duplicate_identifiers}",
            f"Missing identifiers: {self.missing_identifiers}",
            f"Missing addresses: {self.missing_addresses}",
            f"Missing geometry: {self.missing_geometry}",
            f"Suspicious lot areas: {self.suspicious_lot_areas}",
            f"Geometry outside bounds: {self.geometry_outside_bounds}",
            f"Missing county: {self.missing_county}",
            f"Missing state: {self.missing_state}",
            "Errors:",
        ]
        if not self.errors:
            lines.append("  (none)")
        else:
            lines.extend(f"  {error}" for error in self.errors)
        return "\n".join(lines)

    def write(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(asdict(self), indent=2) + "\n")
