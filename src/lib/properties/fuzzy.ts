import { normalizeAddress } from "@/lib/properties/normalize";

/** Drop trailing city / state / ZIP so user queries align with sparse StratMap situs strings. */
export function stripTrailingLocation(norm: string): string {
  let text = norm;
  for (let i = 0; i < 4; i += 1) {
    const next = text
      .replace(/\s+\d{5}(?:\s+\d{4})?\s*$/, "")
      .replace(/\s+TX\s*$/, "")
      .replace(/\s+AUSTIN\s*$/, "")
      .replace(/\s+TRAVIS\s*COUNTY\s*$/, "")
      .replace(/\s+COUNTY\s*$/, "")
      .trim();
    if (next === text) break;
    text = next;
  }
  return text || norm;
}

export function searchKeys(rawQuery: string): { norm: string; fuzzy: string } {
  const norm = normalizeAddress(rawQuery);
  const fuzzy = stripTrailingLocation(norm);
  return { norm, fuzzy: fuzzy || norm };
}

export function allowFuzzyAddressSearch(fuzzyKey: string): boolean {
  return fuzzyKey.length >= 5 && /\d/.test(fuzzyKey) && fuzzyKey.includes(" ");
}

export const FUZZY_SIMILARITY_THRESHOLD = 0.38;

const STREET_SUFFIXES = new Set([
  "AVE",
  "AV",
  "AVENUE",
  "ST",
  "STREET",
  "DR",
  "DRIVE",
  "RD",
  "ROAD",
  "LN",
  "LANE",
  "BLVD",
  "BOULEVARD",
  "CIR",
  "CIRCLE",
  "CV",
  "COVE",
  "CT",
  "COURT",
  "PL",
  "PLACE",
  "WAY",
  "PKWY",
  "PARKWAY",
  "TRL",
  "TRAIL",
  "LOOP",
  "HWY",
  "HIGHWAY",
  "EXPY",
  "EXPRESSWAY",
  "FWY",
  "FREEWAY",
  "STE",
  "SUITE",
  "FL",
  "FLOOR",
  "APT",
  "UNIT",
  "BLDG",
  "BUILDING",
  "TX",
]);

const DIRECTION_ALIASES: Record<string, readonly string[]> = {
  NORTH: ["N"],
  N: ["NORTH"],
  SOUTH: ["S"],
  S: ["SOUTH"],
  EAST: ["E"],
  E: ["EAST"],
  WEST: ["W"],
  W: ["WEST"],
};

export function parseStreetParts(fuzzyKey: string): { house: string; nameTokens: string[] } {
  const parts = fuzzyKey.split(" ").filter(Boolean);
  let house = "";
  if (parts[0]?.match(/^\d+/)) house = parts.shift()!;
  const nameTokens = parts.filter((p) => !STREET_SUFFIXES.has(p));
  return { house, nameTokens };
}

/** Each group is OR (aliases); every group must match at least one token as a whole word. */
export function streetTokenGroups(fuzzyKey: string): string[][] {
  const { nameTokens } = parseStreetParts(fuzzyKey);
  return nameTokens.map((token) => [token, ...(DIRECTION_ALIASES[token] ?? [])]);
}

export function tokenAppearsAsWord(row: string, token: string): boolean {
  const pattern = new RegExp(`(^| )${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`);
  return pattern.test(row);
}

export function rowMatchesStreetTokens(row: string, groups: string[][]): boolean {
  if (groups.length === 0) return true;
  return groups.every((group) => group.some((token) => tokenAppearsAsWord(row, token)));
}

function trigrams(value: string): Set<string> {
  const padded = `  ${value} `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) out.add(padded.slice(i, i + 3));
  return out;
}

/** Mirrors pg_trgm similarity closely enough for unit tests. */
export function trigramSimilarity(a: string, b: string): number {
  if (!a.length || !b.length) return 0;
  if (a === b) return 1;
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection += 1;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Best similarity when the query is a substring of the stored situs (word_similarity-style). */
export function wordSimilarity(query: string, row: string): number {
  if (!query || !row) return 0;
  if (row.includes(query)) return Math.min(1, query.length / row.length + 0.35);
  let best = 0;
  const words = row.split(" ");
  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 1; end <= words.length; end += 1) {
      const slice = words.slice(start, end).join(" ");
      best = Math.max(best, trigramSimilarity(query, slice));
    }
  }
  return best;
}

export function fuzzyAddressScore(query: string, rowNormalized: string | null): number {
  if (!rowNormalized) return 0;
  const { norm, fuzzy } = searchKeys(query);
  if (rowNormalized === norm) return 1;
  const prefix = /\d/.test(norm) && norm.length >= 4;
  if (prefix && rowNormalized.startsWith(norm)) return 0.95;
  if (!allowFuzzyAddressSearch(fuzzy)) return 0;
  const { house } = parseStreetParts(fuzzy);
  if (house && !rowNormalized.startsWith(`${house} `)) return 0;
  const groups = streetTokenGroups(fuzzy);
  if (!rowMatchesStreetTokens(rowNormalized, groups)) return 0;
  return Math.max(
    wordSimilarity(fuzzy, rowNormalized),
    trigramSimilarity(fuzzy, rowNormalized),
    wordSimilarity(norm, rowNormalized),
    trigramSimilarity(norm, rowNormalized),
  );
}

export function fuzzyAddressMatches(query: string, rowNormalized: string | null): boolean {
  return fuzzyAddressScore(query, rowNormalized) >= FUZZY_SIMILARITY_THRESHOLD;
}

/** Builds AND-of-OR whole-word token checks for Postgres (~ '(^| )TOK( |$)'). */
export function buildStreetTokenSql(
  groups: string[][],
  paramStart: number,
): { clause: string; params: string[] } {
  if (groups.length === 0) return { clause: "TRUE", params: [] };
  const params: string[] = [];
  const clauses: string[] = [];
  let index = paramStart;
  for (const group of groups) {
    const ors = group.map((token) => {
      params.push(token);
      const placeholder = `$${index++}`;
      return `p.normalized_address ~ ('(^| )' || ${placeholder} || '( |$)')`;
    });
    clauses.push(`(${ors.join(" OR ")})`);
  }
  return { clause: clauses.join(" AND "), params };
}
