import { withStatePropertyTax, type MarketRow } from "@/markets/rank";
import type { WideRecord } from "@/markets/csv";

export type CrimeCounty = {
  county: string;
  state: string;
  crimeRate: number;
};

function normalizeCountyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\bst\b/g, "saint")
    .replace(/\s+/g, " ")
    .replace(
      /\s+(county|parish|borough|census area|municipality|city and borough|city)$/g,
      "",
    )
    .trim();
}

export function countyKey(county: string, state: string): string {
  return `${state.trim().toUpperCase()}|${normalizeCountyName(county)}`;
}

export function joinMarkets(input: {
  zhvi: Map<string, WideRecord>;
  zori: Map<string, WideRecord>;
  crime: Map<string, CrimeCounty>;
  nationalCrimeRate: number;
  population?: Map<string, number>;
}): { markets: MarketRow[]; nationalCrimeRate: number } {
  const markets: MarketRow[] = [];
  for (const [zip, home] of input.zhvi) {
    const rent = input.zori.get(zip);
    if (!rent) continue;
    const key = countyKey(home.county || rent.county, home.state || rent.state);
    const crime = input.crime.get(key);
    if (!crime) continue;
    const row = withStatePropertyTax({
      zip,
      city: home.city || rent.city,
      state: (home.state || rent.state).toUpperCase(),
      county: home.county || rent.county,
      zhvi: home.value,
      zori: rent.value,
      grossYield: 0,
      crimeRate: crime.crimeRate,
      crimeVsNational: crime.crimeRate / input.nationalCrimeRate,
      population: input.population?.get(zip) ?? null,
    });
    if (!(row.zori > 0) || !(row.zhvi > 0)) continue;
    markets.push(row);
  }
  return { markets, nationalCrimeRate: input.nationalCrimeRate };
}
