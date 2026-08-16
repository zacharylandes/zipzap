import { getFirecrawlClient } from "@/firecrawl/client";
import { SEARCH_CACHE_TTL_MS } from "@/search/schema";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function mercadoLibreHtmlLooksBlocked(html: string): boolean {
  return (
    html.length < 20_000 ||
    html.includes("account-verification") ||
    html.includes("suspicious-traffic") ||
    !html.includes("ui-search-layout__item")
  );
}

export async function fetchMercadoLibreHtmlDirect(url: string): Promise<string> {
  const country = url.includes(".com.ar")
    ? "es-AR"
    : url.includes(".cl")
      ? "es-CL"
      : "es-PE";

  const res = await fetch(url, {
    headers: {
      "user-agent": BROWSER_UA,
      "accept-language": `${country},es;q=0.9,en;q=0.8`,
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`MercadoLibre fetch ${url} -> ${res.status}`);
  }

  return res.text();
}

async function fetchMercadoLibreHtmlFirecrawl(url: string): Promise<string> {
  const client = getFirecrawlClient();
  const result = (await client.scrape(url, {
    formats: ["html"],
    onlyMainContent: false,
    waitFor: 5000,
    proxy: "auto",
    maxAge: SEARCH_CACHE_TTL_MS,
    timeout: 60_000,
  })) as { html?: string };
  return result.html ?? "";
}

export async function fetchMercadoLibreSearchHtml(url: string): Promise<string> {
  try {
    const direct = await fetchMercadoLibreHtmlDirect(url);
    if (!mercadoLibreHtmlLooksBlocked(direct)) return direct;
  } catch {
    // Fall back to Firecrawl when direct fetch fails.
  }

  const firecrawl = await fetchMercadoLibreHtmlFirecrawl(url);
  if (!mercadoLibreHtmlLooksBlocked(firecrawl)) return firecrawl;

  try {
    return await fetchMercadoLibreHtmlDirect(url);
  } catch {
    return firecrawl;
  }
}
