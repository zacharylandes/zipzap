from __future__ import annotations

from typing import Any, Iterator

import httpx

PAGE_SIZE = 2000


def iter_feature_geojson(layer_url: str, *, page_size: int = PAGE_SIZE) -> Iterator[dict[str, Any]]:
    base = layer_url.rstrip("/")
    offset = 0
    with httpx.Client(timeout=120.0) as client:
        while True:
            params = {
                "where": "1=1",
                "outFields": "*",
                "returnGeometry": "true",
                "outSR": "4326",
                "f": "geojson",
                "resultOffset": offset,
                "resultRecordCount": page_size,
            }
            response = client.get(f"{base}/query", params=params)
            response.raise_for_status()
            body = response.json()
            features = body.get("features") or []
            if not features:
                break
            for feature in features:
                yield feature
            if len(features) < page_size:
                break
            offset += page_size
