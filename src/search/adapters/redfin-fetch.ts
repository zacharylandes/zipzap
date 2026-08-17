import { getFirecrawlClient } from "@/firecrawl/client";
import { SEARCH_CACHE_TTL_MS } from "@/search/schema";
import { redfinHtmlLooksBlocked } from "@/search/adapters/redfin-parse";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchRedfinHtmlDirect(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": BROWSER_UA,
      "accept-language": "en-US,en;q=0.9",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!res.ok && res.status !== 202) {
    throw new Error(`Redfin fetch ${url} -> ${res.status}`);
  }

  return res.text();
}

async function fetchRedfinHtmlFirecrawl(url: string): Promise<string> {
  const client = getFirecrawlClient();
  const result = (await client.scrape(url, {
    formats: ["rawHtml", "html"],
    onlyMainContent: false,
    waitFor: 4000,
    proxy: "auto",
    maxAge: SEARCH_CACHE_TTL_MS,
    timeout: 60_000,
  })) as { html?: string; rawHtml?: string };
  return result.rawHtml || result.html || "";
}

export async function fetchRedfinSearchHtml(url: string): Promise<string> {
  try {
    const direct = await fetchRedfinHtmlDirect(url);
    if (!redfinHtmlLooksBlocked(direct)) return direct;
  } catch {
    // Fall back to Firecrawl when direct fetch fails or AWS WAF challenges.
  }

  const firecrawl = await fetchRedfinHtmlFirecrawl(url);
  if (!redfinHtmlLooksBlocked(firecrawl)) return firecrawl;

  try {
    return await fetchRedfinHtmlDirect(url);
  } catch {
    return firecrawl;
  }
}
