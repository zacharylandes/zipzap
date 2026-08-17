import fs from "node:fs";
import path from "node:path";

const DEFAULT_KEYS_PATH = "/Users/zacharylandes/scrape/keys.md";
const FC_KEY = /fc-[a-zA-Z0-9]+/g;

export function resolveKeysPath(): string {
  return process.env.FIRECRAWL_KEYS_PATH?.trim() || DEFAULT_KEYS_PATH;
}

function collectKeys(text: string | undefined, keys: string[], seen: Set<string>) {
  if (!text) return;
  for (const match of text.matchAll(FC_KEY)) {
    const key = match[0];
    if (!seen.has(key)) {
      keys.push(key);
      seen.add(key);
    }
  }
}

function readKeyFile(filePath: string): string | null {
  try {
    const absolute = path.resolve(filePath);
    if (!fs.existsSync(absolute)) return null;
    return fs.readFileSync(absolute, "utf8");
  } catch {
    return null;
  }
}

export function loadFirecrawlKeys(
  keysPath = resolveKeysPath(),
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  collectKeys(env.FIRECRAWL_API_KEY, keys, seen);
  collectKeys(env.FIRECRAWL_API_KEYS, keys, seen);

  const files = [keysPath];
  if (keysPath === resolveKeysPath()) {
    files.push(path.resolve("keys.md"));
  }

  const seenFiles = new Set<string>();
  for (const file of files) {
    const absolute = path.resolve(file);
    if (seenFiles.has(absolute)) continue;
    seenFiles.add(absolute);
    collectKeys(readKeyFile(absolute) ?? undefined, keys, seen);
  }

  return keys;
}

export function redactSecrets(text: string, keys: string[]): string {
  let out = text;
  for (const key of keys) {
    if (!key) continue;
    out = out.split(key).join("[REDACTED_KEY]");
  }
  return out.replace(/fc-[a-f0-9]{32}/gi, "[REDACTED_KEY]");
}
