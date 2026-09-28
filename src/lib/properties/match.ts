import { fuzzyAddressMatches, fuzzyAddressScore } from "@/lib/properties/fuzzy";
import { normalizeAddress } from "@/lib/properties/normalize";

export type Matchable = {
  id: number;
  parcelId: string;
  geoId: string | null;
  normalizedAddress: string | null;
  city: string | null;
  county: string | null;
};

export function matchProperties<T extends Matchable>(rows: T[], q: string): T[] {
  const norm = normalizeAddress(q);
  const raw = q.trim();
  const prefix = /\d/.test(norm) && norm.length >= 4;
  const hits = rows.filter((row) => {
    const city = row.city?.toUpperCase() ?? "";
    const county = row.county?.toUpperCase() ?? "";
    return (
      row.normalizedAddress === norm ||
      row.parcelId === raw ||
      row.geoId === raw ||
      (prefix && (row.normalizedAddress?.startsWith(norm) ?? false)) ||
      city === norm ||
      county === norm ||
      norm === `${county} COUNTY` ||
      fuzzyAddressMatches(q, row.normalizedAddress)
    );
  });
  return hits.sort((a, b) => score(a, q, norm, raw, prefix) - score(b, q, norm, raw, prefix) || a.id - b.id);
}

function score(row: Matchable, q: string, norm: string, raw: string, prefix: boolean): number {
  if (row.normalizedAddress === norm) return 0;
  if (row.parcelId === raw || row.geoId === raw) return 1;
  if (prefix && row.normalizedAddress?.startsWith(norm)) return 2;
  if ((row.city?.toUpperCase() ?? "") === norm) return 3;
  if ((row.county?.toUpperCase() ?? "") === norm || norm === `${row.county?.toUpperCase() ?? ""} COUNTY`) return 4;
  const fuzzyRank = 5 - fuzzyAddressScore(q, row.normalizedAddress);
  return 4 + fuzzyRank;
}
