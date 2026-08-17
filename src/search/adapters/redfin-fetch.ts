import { getFirecrawlClient } from "@/firecrawl/client";
import { SEARCH_CACHE_TTL_MS, type SearchInput } from "@/search/schema";
import {
  parseRedfinGisText,
  redfinHtmlLooksBlocked,
} from "@/search/adapters/redfin-parse";
import type { RawListing } from "@/search/adapters/types";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const GIS_DELTA_DEG = 0.05;
const GIS_NUM_HOMES = 350;

export function redfinMarketSlug(location: string): string {
  const city = location.split(",")[0]?.trim() ?? location;
  return city.toLowerCase().replace(/[^a-z]/g, "");
}

export function buildRedfinGisUrl(opts: {
  marketSlug: string;
  lat: number;
  lng: number;
}): string {
  const { marketSlug, lat, lng } = opts;
  const d = GIS_DELTA_DEG;
  const poly = [
    [lng - d, lat + d],
    [lng + d, lat + d],
    [lng + d, lat - d],
    [lng - d, lat - d],
    [lng - d, lat + d],
  ]
    .map(([x, y]) => `${x} ${y}`)
    .join(",");

  const params = new URLSearchParams({
    al: "1",
    market: marketSlug,
    num_homes: String(GIS_NUM_HOMES),
    ord: "redfin-recommended-asc",
    page_number: "1",
    poly,
    sf: "1,2,3,5,6,7",
    status: "9",
    uipt: "1,2,3,4,5,6,7,8",
    v: "8",
  });
  return `https://www.redfin.com/stingray/api/gis?${params.toString()}`;
}

type ZipCentroid = { lat: number; lng: number; city: string };

async function fetchZipCentroid(zip: string): Promise<ZipCentroid | null> {
  const res = await fetch(`https://api.zippopotam.us/us/${zip}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    places?: Array<{ latitude?: string; longitude?: string; "place name"?: string }>;
  };
  const place = data.places?.[0];
  const lat = Number(place?.latitude);
  const lng = Number(place?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, city: place?.["place name"] ?? "" };
}

export async function fetchRedfinGisListings(input: SearchInput): Promise<RawListing[]> {
  const zip =
    input.zip && /^\d{5}$/.test(input.zip)
      ? input.zip
      : /^\d{5}$/.test(input.location.trim())
        ? input.location.trim()
        : null;
  if (!zip) return [];

  const centroid = await fetchZipCentroid(zip);
  if (!centroid) return [];

  const fromLocation = redfinMarketSlug(input.location);
  const marketSlug = fromLocation || redfinMarketSlug(centroid.city);
  if (!marketSlug) return [];

  const url = buildRedfinGisUrl({
    marketSlug,
    lat: centroid.lat,
    lng: centroid.lng,
  });
  const res = await fetch(url, {
    headers: {
      "user-agent": BROWSER_UA,
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      referer: `https://www.redfin.com/zipcode/${zip}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Redfin GIS ${res.status}`);
  }
  return parseRedfinGisText(await res.text(), zip);
}

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

  try {
    const firecrawl = await fetchRedfinHtmlFirecrawl(url);
    if (!redfinHtmlLooksBlocked(firecrawl)) return firecrawl;
  } catch {
    // Firecrawl credits or scrape errors should not fail the search.
  }

  try {
    return await fetchRedfinHtmlDirect(url);
  } catch {
    return "";
  }
}
