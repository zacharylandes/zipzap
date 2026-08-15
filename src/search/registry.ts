import { facebookAdapter } from "@/search/adapters/facebook";
import { fincaraizAdapter } from "@/search/adapters/fincaraiz";
import { idealistaAdapter } from "@/search/adapters/idealista";
import { immobiliareAdapter } from "@/search/adapters/immobiliare";
import { inmuebles24Adapter } from "@/search/adapters/inmuebles24";
import { portalInmobiliarioAdapter } from "@/search/adapters/portal-inmobiliario";
import { realtorAdapter } from "@/search/adapters/realtor";
import type { SourceAdapter } from "@/search/adapters/types";
import type { CountryCode } from "@/search/schema";

const MVP_ADAPTERS: SourceAdapter[] = [
  inmuebles24Adapter,
  idealistaAdapter,
  realtorAdapter,
  fincaraizAdapter,
  portalInmobiliarioAdapter,
  immobiliareAdapter,
];

function experimentalAdapters(): SourceAdapter[] {
  if (process.env.HOUSE_SEARCH_ENABLE_FACEBOOK === "1") {
    return [facebookAdapter];
  }
  return [];
}

export function getAdaptersForCountry(country: CountryCode): SourceAdapter[] {
  return [...MVP_ADAPTERS, ...experimentalAdapters()].filter((adapter) =>
    adapter.countries.includes(country),
  );
}

export function getAllAdapters(): SourceAdapter[] {
  return [...MVP_ADAPTERS, ...experimentalAdapters()];
}
