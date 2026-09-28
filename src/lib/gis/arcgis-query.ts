type ArcGisFeature = {
  attributes: Record<string, unknown>;
};

type ArcGisQueryResponse = {
  features?: ArcGisFeature[];
  error?: { message?: string };
};

export async function queryLayerIntersects(
  layerUrl: string,
  geometry4326: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  outFields = "*",
): Promise<ArcGisFeature[]> {
  const base = layerUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    f: "json",
    where: "1=1",
    geometry: JSON.stringify(geometry4326),
    geometryType: "esriGeometryPolygon",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields,
    returnGeometry: "false",
  });
  const response = await fetch(`${base}/query?${params.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!response.ok) {
    throw new Error(`ArcGIS HTTP ${response.status} for ${base}`);
  }
  const body = (await response.json()) as ArcGisQueryResponse;
  if (body.error?.message) {
    throw new Error(body.error.message);
  }
  return body.features ?? [];
}

export function attrString(attributes: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = attributes[key] ?? attributes[key.toUpperCase()] ?? attributes[key.toLowerCase()];
    if (value === null || value === undefined || value === "") continue;
    return String(value);
  }
  return null;
}

export function attrNumber(attributes: Record<string, unknown>, ...keys: string[]): number | null {
  const text = attrString(attributes, ...keys);
  if (text === null) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function featureObjectId(attributes: Record<string, unknown>): number | null {
  return attrNumber(attributes, "OBJECTID", "objectid", "FID");
}
