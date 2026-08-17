import type { SearchInput } from "@/search/schema";
import type { RawListing } from "@/search/adapters/types";

type JsonLd = Record<string, unknown>;

function jsonLdBlocks(html: string): JsonLd[] {
  const blocks: JsonLd[] = [];
  for (const match of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed = JSON.parse(match[1] ?? "") as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") blocks.push(item as JsonLd);
        }
      } else if (parsed && typeof parsed === "object") {
        blocks.push(parsed as JsonLd);
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return blocks;
}

function homeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const absolute = value.startsWith("/") ? `https://www.redfin.com${value}` : value;
  if (!/redfin\.com\/.+\/home\/\d+/i.test(absolute)) return null;
  try {
    return new URL(absolute).toString();
  } catch {
    return null;
  }
}

function unwrap(value: unknown): unknown {
  if (value && typeof value === "object" && "value" in value) {
    return (value as { value: unknown }).value;
  }
  return value;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function offerPrice(offers: unknown): { price: number | null; currency: string } {
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (!offer || typeof offer !== "object") {
    return { price: null, currency: "USD" };
  }
  const row = offer as JsonLd;
  return {
    price: asNumber(row.price),
    currency: typeof row.priceCurrency === "string" ? row.priceCurrency : "USD",
  };
}

function photoByHomeUrl(html: string): Map<string, string> {
  const photos = new Map<string, string>();
  for (const card of html.split(/id="MapHomeCard_\d+"/).slice(1)) {
    const href = card.match(/https:\/\/www\.redfin\.com\/[^"'\s]+\/home\/\d+/i)?.[0];
    const img = card.match(
      /src="(https:\/\/ssl\.cdn-redfin\.com\/photo\/[^"]+)"/i,
    )?.[1];
    const url = homeUrl(href);
    if (url && img && !photos.has(url)) photos.set(url, img);
  }
  return photos;
}

export function redfinHtmlLooksBlocked(html: string): boolean {
  return (
    !html.includes("SingleFamilyResidence") &&
    !html.includes('"@type":"Product"')
  );
}

export function parseRedfinHtml(html: string, _input: SearchInput): RawListing[] {
  const photos = photoByHomeUrl(html);
  const byUrl = new Map<string, RawListing>();

  for (const block of jsonLdBlocks(html)) {
    const url = homeUrl(block.url);
    if (!url) continue;
    const current = byUrl.get(url) ?? { url, currency: "USD" };
    const type = String(block["@type"] ?? "");

    if (type === "Product") {
      const offer = offerPrice(block.offers);
      current.price = offer.price ?? current.price ?? null;
      current.currency = offer.currency || current.currency || "USD";
      if (typeof block.name === "string" && block.name.trim()) {
        current.title = block.name.trim();
      }
    }

    if (type === "SingleFamilyResidence" || type === "Accommodation") {
      if (typeof block.name === "string" && block.name.trim()) {
        current.title = current.title || block.name.trim();
      }
      const address =
        block.address && typeof block.address === "object"
          ? (block.address as JsonLd)
          : null;
      const city = typeof address?.addressLocality === "string" ? address.addressLocality : "";
      const state = typeof address?.addressRegion === "string" ? address.addressRegion : "";
      if (city && state) current.location = `${city}, ${state}`;
      current.bedrooms = asNumber(block.numberOfRooms) ?? current.bedrooms ?? null;
      const floor =
        block.floorSize && typeof block.floorSize === "object"
          ? (block.floorSize as JsonLd)
          : null;
      const area = asNumber(floor?.value);
      if (area) {
        current.area = area;
        current.areaUnit = "sqft";
      }
    }

    current.thumbnailUrl = photos.get(url) ?? current.thumbnailUrl ?? null;
    byUrl.set(url, current);
  }

  return [...byUrl.values()].filter((row) => row.url && row.title);
}

export function parseRedfinGisText(text: string, zip: string): RawListing[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\{\}&&/, ""));
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const payload = (parsed as { payload?: { homes?: unknown } }).payload;
  const homes = Array.isArray(payload?.homes) ? payload.homes : [];

  const listings: RawListing[] = [];
  for (const home of homes) {
    if (!home || typeof home !== "object") continue;
    const row = home as Record<string, unknown>;
    const homeZip = String(unwrap(row.zip) ?? unwrap(row.postalCode) ?? "");
    if (homeZip !== zip) continue;
    const url = homeUrl(row.url);
    const street = unwrap(row.streetLine);
    const city = typeof row.city === "string" ? row.city : "";
    const state = typeof row.state === "string" ? row.state : "";
    const title =
      typeof street === "string" && street && city && state
        ? `${street}, ${city}, ${state} ${homeZip}`
        : null;
    if (!url || !title) continue;
    const area = asNumber(unwrap(row.sqFt));
    listings.push({
      title,
      url,
      price: asNumber(unwrap(row.price)),
      currency: "USD",
      bedrooms: asNumber(unwrap(row.beds)),
      bathrooms: asNumber(unwrap(row.baths)),
      area,
      areaUnit: area ? "sqft" : null,
      location: `${city}, ${state}`,
    });
  }
  return listings;
}
