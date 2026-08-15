import { readFileSync } from "node:fs";
import path from "node:path";
import type { MarketsFile } from "@/markets/file";
import type { MarketRow } from "@/markets/rank";

let cached: MarketsFile | null = null;

export function marketsFilePath(cwd = process.cwd()): string {
  return path.join(cwd, "data", "markets.json");
}

export function loadMarketsFile(cwd = process.cwd()): MarketsFile {
  if (cached && cwd === process.cwd()) return cached;
  const raw = readFileSync(marketsFilePath(cwd), "utf8");
  const parsed = JSON.parse(raw) as MarketsFile;
  if (cwd === process.cwd()) cached = parsed;
  return parsed;
}

export function findMarketByZip(
  markets: MarketRow[],
  zip: string,
): MarketRow | undefined {
  const needle = zip.trim().padStart(5, "0").slice(-5);
  return markets.find((row) => row.zip === needle);
}
