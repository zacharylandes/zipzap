import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NumbeoRentFile } from "../src/markets/numbeo";
import { parseNumbeoMonthlyRent, NUMBEO_CENTRE_RENT_LABEL, NUMBEO_OUTSIDE_RENT_LABEL } from "../src/markets/numbeo-parse";
import { LISTING_LOCATIONS } from "../src/search/locations";
import { COUNTRY_CURRENCY, type CountryCode } from "../src/search/schema";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_PATH = path.join(ROOT, "data", "numbeo-rent.json");
const UA = "house-search/0.1 (numbeo rent refresh; research only)";

async function fetchNumbeoRent(numbeoCity: string): Promise<number> {
  const url = `https://www.numbeo.com/property-investment/in/${encodeURIComponent(numbeoCity)}`;
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html" },
  });
  if (!res.ok) {
    throw new Error(`${url} -> ${res.status}`);
  }
  const html = await res.text();
  const rent = parseNumbeoMonthlyRent(html);
  if (rent == null) {
    throw new Error(`${url} -> missing Numbeo 1BR rent row`);
  }
  return rent;
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
        const monthlyRent = await fetchNumbeoRent(location.numbeoCity);
        entries[location.location] = {
          monthlyRent,
          currency: COUNTRY_CURRENCY[countryCode],
          numbeoCity: location.numbeoCity,
          label: location.label,
        };
        console.log(`  ${location.label}: ${monthlyRent} ${COUNTRY_CURRENCY[countryCode]}`);
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
    description: `${NUMBEO_OUTSIDE_RENT_LABEL} (fallback: ${NUMBEO_CENTRE_RENT_LABEL}), monthly`,
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
