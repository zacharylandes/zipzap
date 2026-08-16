import { readFileSync, statSync } from "node:fs";
import path from "node:path";

export type NumbeoRentEntry = {
  monthlyRent: number;
  monthlyRent3br?: number | null;
  currency: string;
  numbeoCity: string;
  label: string;
};

export type NumbeoRentFile = {
  generatedAt: string;
  source: string;
  description: string;
  entries: Record<string, NumbeoRentEntry>;
};

let cached: NumbeoRentFile | null = null;
let cachedMtimeMs = 0;

export function numbeoRentFilePath(cwd = process.cwd()): string {
  return path.join(cwd, "data", "numbeo-rent.json");
}

export function loadNumbeoRentFile(cwd = process.cwd()): NumbeoRentFile {
  const filePath = numbeoRentFilePath(cwd);
  const mtimeMs = statSync(filePath).mtimeMs;
  if (cached && cwd === process.cwd() && cachedMtimeMs === mtimeMs) return cached;
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as NumbeoRentFile;
  if (cwd === process.cwd()) {
    cached = parsed;
    cachedMtimeMs = mtimeMs;
  }
  return parsed;
}

export function findNumbeoRent(locationSlug: string): NumbeoRentEntry | undefined {
  return loadNumbeoRentFile().entries[locationSlug];
}
