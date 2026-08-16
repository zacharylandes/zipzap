import { getFirecrawlClient } from "@/firecrawl/client";
import { SEARCH_CACHE_TTL_MS } from "@/search/schema";
import { pisosHtmlLooksBlocked } from "@/search/adapters/pisos-parse";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchPisosHtmlDirect(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": BROWSER_UA,
      "accept-language": "es-ES,es;q=0.9,en;q=0.8",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Pisos.com fetch ${url} -> ${res.status}`);
  }

  return res.text();
}

async function fetchPisosHtmlFirecrawl(url: string): Promise<string> {
  const client = getFirecrawlClient();
  const result = (await client.scrape(url, {
    formats: ["html"],
    onlyMainContent: false,
    waitFor: 4000,
    proxy: "auto",
    maxAge: SEARCH_CACHE_TTL_MS,
    timeout: 60_000,
  })) as { html?: string };
  return result.html ?? "";
}

export async function fetchPisosSearchHtml(url: string): Promise<string> {
  try {
    const direct = await fetchPisosHtmlDirect(url);
    if (!pisosHtmlLooksBlocked(direct)) return direct;
  } catch {
    // Fall back to Firecrawl when direct fetch fails.
  }

  const firecrawl = await fetchPisosHtmlFirecrawl(url);
  if (!pisosHtmlLooksBlocked(firecrawl)) return firecrawl;

  try {
    return await fetchPisosHtmlDirect(url);
  } catch {
    return firecrawl;
  }
}
