import { facebookAdapter } from "@/search/adapters/facebook";
import { fincaraizAdapter } from "@/search/adapters/fincaraiz";
import { inmuebles24Adapter } from "@/search/adapters/inmuebles24";
import { mercadolibreInmueblesAdapter } from "@/search/adapters/mercadolibre-inmuebles";
import { pisosAdapter } from "@/search/adapters/pisos";
import { redfinAdapter } from "@/search/adapters/redfin";
import type { SourceAdapter } from "@/search/adapters/types";
import type { CountryCode } from "@/search/schema";
import { getSupportedCountries as supportedCountries } from "@/search/supported-countries";

const MVP_ADAPTERS: SourceAdapter[] = [
  inmuebles24Adapter,
  pisosAdapter,
  redfinAdapter,
  fincaraizAdapter,
  mercadolibreInmueblesAdapter,
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

export function getSupportedCountries(): CountryCode[] {
  return supportedCountries();
}
