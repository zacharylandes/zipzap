const ACRES_TO_SQFT = 43560;

export function pickRaw(raw: Record<string, unknown>, ...keys: string[]): unknown {
  const index = new Map<string, unknown>();
  for (const [key, value] of Object.entries(raw)) {
    index.set(key.toLowerCase(), value);
  }
  for (const key of keys) {
    const value = index.get(key.toLowerCase());
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

export function rawNumber(raw: Record<string, unknown>, ...keys: string[]): number | null {
  const value = pickRaw(raw, ...keys);
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function rawInt(raw: Record<string, unknown>, ...keys: string[]): number | null {
  const n = rawNumber(raw, ...keys);
  if (n === null) return null;
  return Math.trunc(n);
}

export function rawString(raw: Record<string, unknown>, ...keys: string[]): string | null {
  const value = pickRaw(raw, ...keys);
  if (value === null) return null;
  const text = String(value).trim();
  return text || null;
}

export function lotAreaConversions(
  lotArea: number | null,
  unit: string | null,
): { sqft: number | null; acres: number | null; sqftDerived: boolean; acresDerived: boolean } {
  if (lotArea === null || !unit) {
    return { sqft: null, acres: null, sqftDerived: false, acresDerived: false };
  }
  const normalized = unit.toLowerCase();
  if (normalized.includes("acre") || normalized === "ac") {
    return {
      sqft: lotArea * ACRES_TO_SQFT,
      acres: lotArea,
      sqftDerived: true,
      acresDerived: false,
    };
  }
  if (normalized.includes("sf") || normalized.includes("sq") || normalized.includes("ft")) {
    return {
      sqft: lotArea,
      acres: lotArea / ACRES_TO_SQFT,
      sqftDerived: false,
      acresDerived: true,
    };
  }
  return { sqft: null, acres: null, sqftDerived: false, acresDerived: false };
}

export function parseStratmapBuilding(raw: Record<string, unknown>) {
  const statLand = rawString(raw, "STAT_LAND_USE", "stat_land_use", "STAT_LAND_");
  const locLand = rawString(raw, "LOC_LAND_USE", "loc_land_use", "LOC_LAND_U");
  const landUse = [statLand, locLand].filter(Boolean).join(" / ") || null;
  return {
    yearBuilt: rawInt(raw, "YEAR_BUILT", "year_built"),
    stories: rawInt(raw, "STORIES", "stories", "NUM_STORIES"),
    units: rawInt(raw, "UNITS", "units", "NUM_UNITS"),
    buildingSqft: rawNumber(raw, "BLDG_SQFT", "BUILDING_SQFT", "TOT_MAIN_SF", "MAIN_AREA"),
    propertyUse: statLand,
    landUse,
    assessedValue: rawNumber(raw, "MKT_VALUE", "MARKET", "market_value", "TOTAL_VALUE", "MKT_VAL"),
    improvementValue: rawNumber(raw, "IMPROVEMENT", "IMPRV_VALUE", "imprv_value", "IMP_VALUE"),
    landValue: rawNumber(raw, "LAND_VALUE", "land_value", "LAND_VAL"),
    taxYear: rawInt(raw, "TAX_YEAR", "tax_year"),
  };
}
