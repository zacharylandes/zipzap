import { COUNTRY_LABELS, type CountryCode } from "@/search/schema";

/** Countries with an MVP listing adapter wired in production. */
export const SUPPORTED_COUNTRIES: CountryCode[] = ["AR", "CL", "CO", "ES", "MX", "PE", "US"];

export function getSupportedCountries(): CountryCode[] {
  return [...SUPPORTED_COUNTRIES];
}

export function supportedCountryOptions(): { code: CountryCode; label: string }[] {
  return SUPPORTED_COUNTRIES.map((code) => ({
    code,
    label: COUNTRY_LABELS[code],
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export function parseCountryCode(raw: string | null | undefined): CountryCode {
  const code = raw?.trim().toUpperCase();
  if (code && SUPPORTED_COUNTRIES.includes(code as CountryCode)) {
    return code as CountryCode;
  }
  return "US";
}
