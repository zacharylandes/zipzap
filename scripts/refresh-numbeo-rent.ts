import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NumbeoRentFile } from "../src/markets/numbeo";
import { parseNumbeoRents, NUMBEO_OUTSIDE_RENT_LABEL, NUMBEO_OUTSIDE_3BR_LABEL } from "../src/markets/numbeo-parse";
import { LISTING_LOCATIONS } from "../src/search/locations";
import { COUNTRY_CURRENCY, type CountryCode } from "../src/search/schema";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_PATH = path.join(ROOT, "data", "numbeo-rent.json");
const UA = "house-search/0.1 (numbeo rent refresh; research only)";

async function fetchNumbeoHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`${url} -> ${res.status}`);
  }
  return res.text();
}

async function fetchNumbeoRent(numbeoCity: string): Promise<{
  monthlyRent: number;
  monthlyRent3br: number | null;
}> {
  const encoded = encodeURIComponent(numbeoCity);
  const urls = [
    `https://www.numbeo.com/property-investment/in/${encoded}`,
    `https://www.numbeo.com/cost-of-living/in/${encoded}`,
  ];
  let oneBedroom: number | null = null;
  let threeBedroom: number | null = null;
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const rents = parseNumbeoRents(await fetchNumbeoHtml(url));
      oneBedroom ??= rents.oneBedroom;
      threeBedroom ??= rents.threeBedroom;
      if (oneBedroom != null && threeBedroom != null) break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (oneBedroom == null) {
    throw lastError ?? new Error(`${numbeoCity} -> missing Numbeo 1BR rent row`);
  }
  return { monthlyRent: oneBedroom, monthlyRent3br: threeBedroom };
}

async function main() {
  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  let entries: NumbeoRentFile["entries"] = {};
  try {
    const existing = JSON.parse(await readFile(OUT_PATH, "utf8")) as NumbeoRentFile;
    entries = { ...existing.entries };
  } catch {
    // fresh file
  }
  const errors: string[] = [];

  for (const [countryCode, locations] of Object.entries(LISTING_LOCATIONS) as [
    CountryCode,
    (typeof LISTING_LOCATIONS)[keyof typeof LISTING_LOCATIONS],
  ][]) {
    for (const location of locations) {
      try {
        const rents = await fetchNumbeoRent(location.numbeoCity);
        entries[location.location] = {
          monthlyRent: rents.monthlyRent,
          monthlyRent3br: rents.monthlyRent3br,
          currency: COUNTRY_CURRENCY[countryCode],
          numbeoCity: location.numbeoCity,
          label: location.label,
        };
        console.log(
          `  ${location.label}: 1BR ${rents.monthlyRent} / 3BR ${rents.monthlyRent3br ?? "—"} ${COUNTRY_CURRENCY[countryCode]}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${location.label} (${location.numbeoCity}): ${message}`);
        console.warn(`  skip ${location.label}: ${message}`);
      }
    }
  }

  const file: NumbeoRentFile = {
    generatedAt: new Date().toISOString(),
    source: "https://www.numbeo.com/property-investment/",
    description: `${NUMBEO_OUTSIDE_RENT_LABEL} and ${NUMBEO_OUTSIDE_3BR_LABEL} (centre fallback), monthly`,
    entries,
  };

  await writeFile(OUT_PATH, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`Wrote ${Object.keys(entries).length} rents to ${OUT_PATH}`);
  if (Object.keys(entries).length === 0) {
    process.exitCode = 1;
  }
  if (errors.length) {
    console.warn(`${errors.length} cities skipped:\n${errors.join("\n")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
