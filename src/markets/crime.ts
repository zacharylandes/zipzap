import { parseCsv } from "@/markets/csv";
import { countyKey, type CrimeCounty } from "@/markets/join";

const STATE_ABBR: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC",
};

export function normalizeState(value: string): string {
  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return STATE_ABBR[trimmed.toUpperCase()] ?? trimmed.toUpperCase();
}

function findCol(headers: string[][], pattern: RegExp): number {
  for (const header of headers) {
    const idx = header.findIndex((cell) => pattern.test(cell.trim()));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseChrCrime(csv: string): {
  counties: Map<string, CrimeCounty>;
  nationalCrimeRate: number | null;
} {
  const rows = parseCsv(csv);
  if (rows.length < 2) return { counties: new Map(), nationalCrimeRate: null };

  const header0 = rows[0]!;
  const header1 = rows[1]!;
  const headers = [header0, header1];
  const dualHeader = header1.length === header0.length && header1.some((cell) =>
    /^(state|county|fipscode|v\d+_rawvalue)$/i.test(cell.trim()),
  );
  const dataStart = dualHeader ? 2 : 1;

  const stateIdx = findCol(headers, /^(state abbreviation|state)$/i);
  const countyIdx = findCol(headers, /^(county|name)$/i);
  const countyFipsIdx = findCol(headers, /^(county fips code|countycode)$/i);
  let crimeIdx = findCol(headers, /violent crime raw value/i);
  if (crimeIdx < 0) crimeIdx = findCol(headers, /violent crime/i);
  if (crimeIdx < 0) crimeIdx = findCol(headers, /homicides raw value/i);
  if (stateIdx < 0 || countyIdx < 0 || crimeIdx < 0) {
    return { counties: new Map(), nationalCrimeRate: null };
  }

  const counties = new Map<string, CrimeCounty>();
  let nationalCrimeRate: number | null = null;

  for (const row of rows.slice(dataStart)) {
    const stateRaw = (row[stateIdx] ?? "").trim();
    const countyRaw = (row[countyIdx] ?? "").trim();
    const countyFips = (row[countyFipsIdx] ?? "").trim();
    const rate = Number((row[crimeIdx] ?? "").replace(/,/g, ""));
    if (!Number.isFinite(rate)) continue;

    if (/^(US|United States)$/i.test(stateRaw) || /^united states$/i.test(countyRaw)) {
      nationalCrimeRate = rate;
      continue;
    }
    if (!countyRaw) continue;
    if (countyFipsIdx >= 0 && /^0+$/.test(countyFips)) continue;

    const state = normalizeState(stateRaw);
    if (!/^[A-Z]{2}$/.test(state)) continue;
    const record: CrimeCounty = { county: countyRaw, state, crimeRate: rate };
    counties.set(countyKey(countyRaw, state), record);
  }

  return { counties, nationalCrimeRate };
}
