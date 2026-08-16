import {
  normalizeRawListing,
  slugifyLocation,
} from "@/search/adapters/firecrawl-adapter";
import { fetchPisosSearchHtml } from "@/search/adapters/pisos-fetch";
import { parsePisosHtml, pisosHtmlLooksBlocked } from "@/search/adapters/pisos-parse";
import type { AdapterResult, SourceAdapter } from "@/search/adapters/types";
import { MAX_LISTINGS_PER_SOURCE, type Listing, type SearchInput } from "@/search/schema";

const ORIGIN = "https://www.pisos.com";

const CITY_SLUGS: Record<string, string> = {
  madrid: "madrid",
  madrid_madrid: "madrid",
  barcelona: "barcelona",
  barcelona_barcelona: "barcelona",
  valencia: "valencia",
  valencia_valencia: "valencia",
  sevilla: "sevilla",
  sevilla_sevilla: "sevilla",
  malaga: "malaga",
  malaga_malaga: "malaga",
  zaragoza: "zaragoza",
  zaragoza_zaragoza: "zaragoza",
  bilbao: "bilbao",
  bilbao_bizkaia: "bilbao",
  palma: "palma_de_mallorca",
  palma_de_mallorca: "palma_de_mallorca",
  palma_de_mallorca_balears_illes: "palma_de_mallorca",
  alicante: "alicante",
  alicante_alacant_alicante: "alicante",
  murcia: "murcia",
  murcia_murcia: "murcia",
  cordoba: "cordoba",
  cordoba_cordoba: "cordoba",
  granada: "granada",
  granada_granada: "granada",
  vigo: "vigo",
  vigo_pontevedra: "vigo",
  a_coruna: "a_coruna",
  a_coruna_a_coruna: "a_coruna",
  donostia_san_sebastian: "donostia_san_sebastian",
  donostia_san_sebastian_gipuzkoa: "donostia_san_sebastian",
  san_sebastian: "donostia_san_sebastian",
};

export function pisosCitySlug(location: string): string {
  const slug = slugifyLocation(location).replace(/-/g, "_");
  if (CITY_SLUGS[slug]) return CITY_SLUGS[slug];
  const parts = slug.split("_");
  if (parts.length === 2 && parts[0] && parts[0] === parts[1]) return parts[0];
  return slug;
}

export function buildPisosSearchUrl(input: SearchInput): string {
  const city = pisosCitySlug(input.location);
  const op = input.listingType === "rent" ? "alquiler" : "venta";
  const segments = [`${op}/pisos-${city}`];
  if (input.minPrice != null) segments.push(`desde-${input.minPrice}`);
  if (input.maxPrice != null) segments.push(`hasta-${input.maxPrice}`);
  return `${ORIGIN}/${segments.join("/")}/`;
}

export const pisosAdapter: SourceAdapter = {
  id: "pisos",
  name: "Pisos.com",
  countries: ["ES"],
  buildSearchUrl: buildPisosSearchUrl,
  async search(input: SearchInput): Promise<AdapterResult> {
    if (!pisosAdapter.countries.includes(input.country)) {
      return {
        listings: [],
        status: {
          sourceId: pisosAdapter.id,
          sourceName: pisosAdapter.name,
          status: "unsupported",
          message: `Not available for ${input.country}`,
          count: 0,
        },
      };
    }

    const searchUrl = buildPisosSearchUrl(input);
    const meta = {
      sourceId: pisosAdapter.id,
      sourceName: pisosAdapter.name,
      baseUrl: ORIGIN,
    };

    try {
      const html = await fetchPisosSearchHtml(searchUrl);
      const rawListings = parsePisosHtml(html, input);

      const listings: Listing[] = [];
      for (const raw of rawListings) {
        const normalized = normalizeRawListing(raw, input, meta);
        if (normalized) listings.push(normalized);
        if (listings.length >= MAX_LISTINGS_PER_SOURCE) break;
      }

      return {
        listings,
        status: {
          sourceId: meta.sourceId,
          sourceName: meta.sourceName,
          status: listings.length > 0 ? "ok" : "empty",
          count: listings.length,
          message:
            listings.length === 0
              ? pisosHtmlLooksBlocked(html)
                ? "Pisos.com blocked the listing fetch"
                : "No listings extracted from the result page"
              : undefined,
        },
      };
    } catch (error) {
      return {
        listings: [],
        status: {
          sourceId: meta.sourceId,
          sourceName: meta.sourceName,
          status: "error",
          count: 0,
          message:
            error instanceof Error ? error.message : "Failed to scrape listings",
        },
      };
    }
  },
};
