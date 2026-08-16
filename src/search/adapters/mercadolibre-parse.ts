import type { CountryCode, SearchInput } from "@/search/schema";
import { COUNTRY_CURRENCY } from "@/search/schema";
import type { RawListing } from "@/search/adapters/types";

const CARD_RE = /<li class="ui-search-layout__item">([\s\S]*?)<\/li>/g;
const LISTING_HREF_RE =
  /href="(https:\/\/(?:departamento|casa|inmueble|local|oficina|terreno|cochera)\.mercadolibre[^"]+)"/i;
const PRICE_ARIA_RE =
  /aria-label="([^"]+)"[^>]*aria-roledescription="Monto"/i;
const IMG_ALT_RE = /<img[^>]*class="[^"]*poly-component__picture[^"]*"[^>]*alt="([^"]+)"/i;
const TITLE_RE = /class="[^"]*poly-component__title[^"]*"[^>]*>([^<]+)</i;
const THUMB_RE = /<img[^>]*class="[^"]*poly-component__picture[^"]*"[^>]*src="([^"]+)"/i;
const BED_RE = /(\d+)\s+dorm/i;
const BATH_RE = /(\d+)\s+ba[nñ]o/i;
const AREA_RE = /(\d[\d.,]*)\s*m²/i;

export function parseLocalizedNumber(raw: string): number | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ""));
  }
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    return Number(cleaned.replace(/,/g, ""));
  }

  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/\./g, "").replace(/,/g, ".")
    : cleaned.replace(/,/g, "");

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseMercadoLibrePriceLabel(
  label: string,
  countryCurrency: string,
): { price: number | null; currency: string } {
  const lower = label.toLowerCase();
  const currency = /d[oó]lar|usd/.test(lower)
    ? "USD"
    : /peso|sol/.test(lower)
      ? countryCurrency
      : countryCurrency;

  const match = label.match(/[\d][\d.,]*/);
  if (!match) return { price: null, currency };
  return { price: parseLocalizedNumber(match[0]), currency };
}

function cleanTitle(value: string | undefined): string | null {
  const title = value?.replace(/\s+/g, " ").trim();
  return title && title.length > 1 ? title : null;
}

function cleanUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function parseMercadoLibreHtml(
  html: string,
  input: SearchInput,
): RawListing[] {
  if (!html.includes("ui-search-layout__item")) return [];

  const countryCurrency = COUNTRY_CURRENCY[input.country as CountryCode];
  const listings: RawListing[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(CARD_RE)) {
    const card = match[1] ?? "";
    const href = card.match(LISTING_HREF_RE)?.[1];
    const url = cleanUrl(href);
    if (!url || seen.has(url)) continue;

    const priceLabel = card.match(PRICE_ARIA_RE)?.[1];
    const { price, currency } = priceLabel
      ? parseMercadoLibrePriceLabel(priceLabel, countryCurrency)
      : { price: null, currency: countryCurrency };

    const title =
      cleanTitle(card.match(TITLE_RE)?.[1]) ??
      cleanTitle(card.match(IMG_ALT_RE)?.[1]);
    if (!title) continue;

    const bedrooms = parseLocalizedNumber(card.match(BED_RE)?.[1] ?? "");
    const bathrooms = parseLocalizedNumber(card.match(BATH_RE)?.[1] ?? "");
    const area = parseLocalizedNumber(card.match(AREA_RE)?.[1] ?? "");

    seen.add(url);
    listings.push({
      title,
      url,
      price,
      currency,
      bedrooms: bedrooms ?? (input.bedrooms != null ? input.bedrooms : null),
      bathrooms,
      area,
      areaUnit: area != null ? "sqm" : null,
      thumbnailUrl: card.match(THUMB_RE)?.[1] ?? null,
      location: input.location,
    });
  }

  return listings;
}
