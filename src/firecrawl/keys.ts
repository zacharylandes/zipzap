import fs from "node:fs";
import path from "node:path";

const DEFAULT_KEYS_PATH = "/Users/zacharylandes/scrape/keys.md";

export function resolveKeysPath(): string {
  return process.env.FIRECRAWL_KEYS_PATH?.trim() || DEFAULT_KEYS_PATH;
}

export function loadFirecrawlKeys(
  keysPath = resolveKeysPath(),
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  const envKey = env.FIRECRAWL_API_KEY?.trim();
  if (envKey?.startsWith("fc-") && !seen.has(envKey)) {
    keys.push(envKey);
    seen.add(envKey);
  }

  try {
    const absolute = path.resolve(keysPath);
    if (fs.existsSync(absolute)) {
      const text = fs.readFileSync(absolute, "utf8");
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (line.startsWith("fc-") && !seen.has(line)) {
          keys.push(line);
          seen.add(line);
        }
      }
    }
  } catch {
    // Missing/unreadable key file is non-fatal when env key exists.
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
