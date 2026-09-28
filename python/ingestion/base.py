from __future__ import annotations

from collections.abc import Iterable

from ingestion.models import MappedParcel
from ingestion.report import IngestReport
from ingestion.store import Store


def classify(previous: str | None, checksum: str) -> str:
    if previous is None:
        return "insert"
    if previous == checksum:
        return "unchanged"
    return "update"


def ingest_parcels(records: Iterable[MappedParcel], store: Store, report: IngestReport, source_id: int) -> IngestReport:
    existing = store.latest_checksums(source_id)
    seen: set[str] = set()
    for record in records:
        report.records_parsed += 1
        _count_problems(report, record)
        if record.external_id in seen:
            report.duplicate_identifiers += 1
            report.errors.append(f"duplicate identifier {record.external_id}")
            continue
        seen.add(record.external_id)
        action = classify(existing.get(record.external_id), record.checksum)
        if action == "unchanged":
            report.records_unchanged += 1
            continue
        if "missing_state" in record.problems or "missing_county" in record.problems:
            store.append_source(source_id, record)
            continue
        store.append_source(source_id, record)
        store.upsert_property(source_id, record)
        if action == "insert":
            report.records_inserted += 1
        else:
            report.records_updated += 1
    return report


def _count_problems(report: IngestReport, record: MappedParcel) -> None:
    problems = set(record.problems)
    if "invalid_geometry" in problems:
        report.invalid_geometries += 1
    if "missing_geometry" in problems or "empty_geometry" in problems:
        report.missing_geometry += 1
    if "missing_identifiers" in problems:
        report.missing_identifiers += 1
    if "missing_addresses" in problems:
        report.missing_addresses += 1
    if "suspicious_lot_area" in problems:
        report.suspicious_lot_areas += 1
    if "geometry_outside_bounds" in problems:
        report.geometry_outside_bounds += 1
    if "missing_county" in problems:
        report.missing_county += 1
    if "missing_state" in problems:
        report.missing_state += 1
    if "crs_error" in problems:
        report.errors.append(f"crs error {record.external_id}")
