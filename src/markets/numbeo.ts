import { readFileSync } from "node:fs";
import path from "node:path";

export type NumbeoRentEntry = {
  monthlyRent: number;
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

export function numbeoRentFilePath(cwd = process.cwd()): string {
  return path.join(cwd, "data", "numbeo-rent.json");
}

export function loadNumbeoRentFile(cwd = process.cwd()): NumbeoRentFile {
  if (cached && cwd === process.cwd()) return cached;
  const raw = readFileSync(numbeoRentFilePath(cwd), "utf8");
  const parsed = JSON.parse(raw) as NumbeoRentFile;
  if (cwd === process.cwd()) cached = parsed;
  return parsed;
}

export function findNumbeoRent(locationSlug: string): NumbeoRentEntry | undefined {
  return loadNumbeoRentFile().entries[locationSlug];
}
