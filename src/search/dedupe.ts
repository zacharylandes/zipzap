import type { Listing } from "@/search/schema";

function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
      (p) => u.searchParams.delete(p),
    );
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function signature(listing: Listing): string {
  const title = listing.title.toLowerCase().replace(/\s+/g, " ").trim();
  const loc = (listing.location ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const price = listing.price ?? "na";
  return `${title}|${loc}|${price}|${listing.currency}`;
}

export function dedupeListings(listings: Listing[]): Listing[] {
  const byUrl = new Set<string>();
  const bySig = new Set<string>();
  const out: Listing[] = [];

  for (const listing of listings) {
    const urlKey = canonicalizeUrl(listing.url);
    if (byUrl.has(urlKey)) continue;
    const sig = signature(listing);
    if (bySig.has(sig)) continue;
    byUrl.add(urlKey);
    bySig.add(sig);
    out.push(listing);
  }

  return out;
}
