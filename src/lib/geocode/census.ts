export type GeocodeHit = {
  matchedAddress: string;
  longitude: number;
  latitude: number;
};

/** U.S. Census Bureau geocoder — public, no API key. Travis/Austin addresses only in practice. */
export async function geocodeOnelineAddress(query: string): Promise<GeocodeHit | null> {
  const params = new URLSearchParams({
    address: query,
    benchmark: "Public_AR_Current",
    format: "json",
  });
  const response = await fetch(
    `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as {
    result?: { addressMatches?: { matchedAddress?: string; coordinates?: { x: number; y: number } }[] };
  };
  const match = body.result?.addressMatches?.[0];
  if (!match?.coordinates) return null;
  const { x, y } = match.coordinates;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    matchedAddress: match.matchedAddress ?? query,
    longitude: x,
    latitude: y,
  };
}
