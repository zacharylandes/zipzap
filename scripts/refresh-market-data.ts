import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseWideIndex } from "../src/markets/csv";
import { parseChrCrime } from "../src/markets/crime";
import type { MarketsFile } from "../src/markets/file";
import { joinMarkets } from "../src/markets/join";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW_DIR = path.join(ROOT, "data", "raw");
const OUT_PATH = path.join(ROOT, "data", "markets.json");
const FALLBACK_NATIONAL_CRIME = 370;

const ZHVI_URLS = [
  "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfr_tier_0.33_0.67_sm_sa_month.csv",
  "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
];

const ZORI_URLS = [
  "https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfr_sm_month.csv",
  "https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_month.csv",
];

const CRIME_URLS = [
  "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2022.csv",
  "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2023.csv",
  "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2024.csv",
  "https://www.countyhealthrankings.org/sites/default/files/media/document/analytic_data2025.csv",
];

const UA =
  "house-search/0.1 (research data refresh; +https://www.zillow.com/research/data/)";

async function downloadFirst(urls: string[], filename: string): Promise<{ url: string; csv: string }> {
  const cachedPath = path.join(RAW_DIR, filename);
  try {
    const csv = await readFile(cachedPath, "utf8");
    if (csv.length > 1_000 && (filename !== "crime.csv" || /violent crime/i.test(csv.slice(0, 200_000)))) {
      return { url: `file://${cachedPath}`, csv };
    }
  } catch {
    // download
  }
  const errors: string[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/csv,*/*" } });
      if (!res.ok) {
        errors.push(`${url} -> ${res.status}`);
        continue;
      }
      const csv = await res.text();
      if (csv.length < 1_000 || csv.trimStart().startsWith("<")) {
        errors.push(`${url} -> empty or HTML`);
        continue;
      }
      if (filename === "crime.csv" && !/violent crime/i.test(csv.slice(0, 200_000))) {
        errors.push(`${url} -> missing Violent crime column`);
        continue;
      }
      await writeFile(path.join(RAW_DIR, filename), csv);
      return { url, csv };
    } catch (error) {
      errors.push(`${url} -> ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Failed to download ${filename}:\n${errors.join("\n")}`);
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(path.dirname(OUT_PATH), { recursive: true });

  console.log("Downloading ZHVI…");
  const zhviFile = await downloadFirst(ZHVI_URLS, "zhvi.csv");
  console.log(`  ${zhviFile.url} (${zhviFile.csv.length} bytes)`);

  console.log("Downloading ZORI…");
  const zoriFile = await downloadFirst(ZORI_URLS, "zori.csv");
  console.log(`  ${zoriFile.url} (${zoriFile.csv.length} bytes)`);

  console.log("Downloading county crime…");
  const crimeFile = await downloadFirst(CRIME_URLS, "crime.csv");
  console.log(`  ${crimeFile.url} (${crimeFile.csv.length} bytes)`);

  const zhvi = parseWideIndex(zhviFile.csv);
  const zori = parseWideIndex(zoriFile.csv);
  const crime = parseChrCrime(crimeFile.csv);
  const nationalCrimeRate = crime.nationalCrimeRate ?? FALLBACK_NATIONAL_CRIME;

  const { markets } = joinMarkets({
    zhvi,
    zori,
    crime: crime.counties,
    nationalCrimeRate,
  });

  markets.sort((a, b) => b.grossYield - a.grossYield);

  const payload: MarketsFile = {
    generatedAt: new Date().toISOString(),
    sources: {
      zhvi: zhviFile.url,
      zori: zoriFile.url,
      crime: crimeFile.url,
    },
    nationalCrimeRate,
    markets,
  };

  await writeFile(OUT_PATH, JSON.stringify(payload));
  console.log(
    `Wrote ${markets.length} ZIPs to ${OUT_PATH} (national violent crime ${nationalCrimeRate}/100k)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
