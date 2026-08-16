import type { SearchInput } from "@/search/schema";
import type { RawListing } from "@/search/adapters/types";

const TITLE_RE =
  /<a href="([^"]+)" class="ad-preview__title">([^<]*)<\/a>/gi;
const PRICE_ATTR_RE = /data-ad-price="(\d+)"/i;
const PRICE_TEXT_RE = /ad-preview__price">\s*([^<]+)/i;
const SUBTITLE_RE = /ad-preview__subtitle">([^<]*)/i;
const IMG_RE =
  /(?:data-src|src)="(https:\/\/fotos\.imghs\.net[^"]+)"/i;
const BEDS_RE = /(\d+)\s*habs?\./i;
const BATHS_RE = /(\d+)\s*baños/i;
const AREA_RE = /(\d[\d.]*)\s*m²/i;

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(Number(dec)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

export function pisosHtmlLooksBlocked(html: string): boolean {
  return html.length < 20_000 || !html.includes("ad-preview__title");
}

function parseEuroAmount(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parsePisosHtml(
  html: string,
  _input: SearchInput,
): RawListing[] {
  const listings: RawListing[] = [];

  for (const match of html.matchAll(TITLE_RE)) {
    const href = match[1];
    const title = decodeHtmlEntities(match[2] ?? "").trim();
    if (!href || !title) continue;

    const index = match.index ?? 0;
    const card = decodeHtmlEntities(
      html.slice(Math.max(0, index - 4_000), index + match[0].length + 2_500),
    );

    const price =
      Number(card.match(PRICE_ATTR_RE)?.[1]) ||
      parseEuroAmount(card.match(PRICE_TEXT_RE)?.[1] ?? "") ||
      null;

    listings.push({
      title,
      price: price && Number.isFinite(price) && price > 0 ? price : null,
      currency: "EUR",
      bedrooms: Number(card.match(BEDS_RE)?.[1]) || null,
      bathrooms: Number(card.match(BATHS_RE)?.[1]) || null,
      area: parseEuroAmount(card.match(AREA_RE)?.[1] ?? ""),
      areaUnit: "sqm",
      location: card.match(SUBTITLE_RE)?.[1]?.trim() || null,
      thumbnailUrl: card.match(IMG_RE)?.[1] ?? null,
      url: href,
    });
  }

  return listings;
}
