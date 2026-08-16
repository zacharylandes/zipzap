import type { CountryCode } from "@/search/schema";

export type ListingLocation = {
  label: string;
  /** Exact value passed to portal URL builders (slug or city-province slug). */
  location: string;
  region: string;
};

/** Curated portal slugs — not shown in the UI for listing browse. */
export const LISTING_LOCATIONS: Record<
  Exclude<CountryCode, "US" | "IT">,
  ListingLocation[]
> = {
  MX: [
    { label: "Ciudad de México", location: "ciudad-de-mexico", region: "Ciudad de México" },
    { label: "Guadalajara", location: "guadalajara", region: "Jalisco" },
    { label: "Monterrey", location: "monterrey", region: "Nuevo León" },
    { label: "Querétaro", location: "queretaro", region: "Querétaro" },
    { label: "León", location: "leon", region: "Guanajuato" },
    { label: "Puebla", location: "puebla", region: "Puebla" },
    { label: "Tijuana", location: "tijuana", region: "Baja California" },
    { label: "Mérida", location: "merida", region: "Yucatán" },
    { label: "Cancún", location: "cancun", region: "Quintana Roo" },
    { label: "Playa del Carmen", location: "playa-del-carmen", region: "Quintana Roo" },
    { label: "Toluca", location: "toluca", region: "Estado de México" },
    { label: "Aguascalientes", location: "aguascalientes", region: "Aguascalientes" },
    { label: "San Miguel de Allende", location: "san-miguel-de-allende", region: "Guanajuato" },
    { label: "Cuernavaca", location: "cuernavaca", region: "Morelos" },
    { label: "Oaxaca", location: "oaxaca-de-juarez", region: "Oaxaca" },
    { label: "Acapulco", location: "acapulco", region: "Guerrero" },
    { label: "Veracruz", location: "veracruz", region: "Veracruz" },
    { label: "Hermosillo", location: "hermosillo", region: "Sonora" },
    { label: "Chihuahua", location: "chihuahua", region: "Chihuahua" },
    { label: "Saltillo", location: "saltillo", region: "Coahuila" },
    { label: "Mazatlán", location: "mazatlan", region: "Sinaloa" },
    { label: "Puerto Vallarta", location: "puerto-vallarta", region: "Jalisco" },
    { label: "Los Cabos", location: "los-cabos", region: "Baja California Sur" },
  ],
  ES: [
    { label: "Madrid", location: "madrid-madrid", region: "Madrid" },
    { label: "Barcelona", location: "barcelona-barcelona", region: "Cataluña" },
    { label: "Valencia", location: "valencia-valencia", region: "Valencia" },
    { label: "Sevilla", location: "sevilla-sevilla", region: "Andalucía" },
    { label: "Málaga", location: "malaga-malaga", region: "Andalucía" },
    { label: "Zaragoza", location: "zaragoza-zaragoza", region: "Aragón" },
    { label: "Bilbao", location: "bilbao-bizkaia", region: "País Vasco" },
    { label: "Palma de Mallorca", location: "palma-de-mallorca-balears-illes", region: "Baleares" },
    { label: "Alicante", location: "alicante-alacant-alicante", region: "Valencia" },
    { label: "Murcia", location: "murcia-murcia", region: "Murcia" },
    { label: "Córdoba", location: "cordoba-cordoba", region: "Andalucía" },
    { label: "Granada", location: "granada-granada", region: "Andalucía" },
    { label: "Vigo", location: "vigo-pontevedra", region: "Galicia" },
    { label: "A Coruña", location: "a-coruna-a-coruna", region: "Galicia" },
    { label: "San Sebastián", location: "donostia-san-sebastian-gipuzkoa", region: "País Vasco" },
  ],
  CO: [
    { label: "Bogotá", location: "bogota", region: "Cundinamarca" },
    { label: "Medellín", location: "medellin", region: "Antioquia" },
    { label: "Cali", location: "cali", region: "Valle del Cauca" },
    { label: "Barranquilla", location: "barranquilla", region: "Atlántico" },
    { label: "Cartagena", location: "cartagena", region: "Bolívar" },
    { label: "Bucaramanga", location: "bucaramanga", region: "Santander" },
    { label: "Pereira", location: "pereira", region: "Risaralda" },
    { label: "Manizales", location: "manizales", region: "Caldas" },
    { label: "Cúcuta", location: "cucuta", region: "Norte de Santander" },
    { label: "Santa Marta", location: "santa-marta", region: "Magdalena" },
  ],
  CL: [
    { label: "Santiago", location: "santiago", region: "Región Metropolitana" },
    { label: "Viña del Mar", location: "vina-del-mar", region: "Valparaíso" },
    { label: "Valparaíso", location: "valparaiso", region: "Valparaíso" },
    { label: "Concepción", location: "concepcion", region: "Biobío" },
    { label: "La Serena", location: "la-serena", region: "Coquimbo" },
    { label: "Antofagasta", location: "antofagasta", region: "Antofagasta" },
    { label: "Temuco", location: "temuco", region: "La Araucanía" },
    { label: "Puerto Montt", location: "puerto-montt", region: "Los Lagos" },
    { label: "Rancagua", location: "rancagua", region: "O'Higgins" },
  ],
};

export function listingLocationsForCountry(country: CountryCode): ListingLocation[] {
  if (country === "US" || country === "IT") return [];
  return LISTING_LOCATIONS[country] ?? [];
}

export function defaultListingLocation(country: CountryCode): string {
  return listingLocationsForCountry(country)[0]?.location ?? "";
}

export function listingLocationGroups(
  country: CountryCode,
): { region: string; locations: ListingLocation[] }[] {
  return groupListingLocations(listingLocationsForCountry(country));
}

export function groupListingLocations(
  locations: ListingLocation[],
): { region: string; locations: ListingLocation[] }[] {
  const regions = new Map<string, ListingLocation[]>();
  for (const entry of locations) {
    const group = regions.get(entry.region) ?? [];
    group.push(entry);
    regions.set(entry.region, group);
  }
  return [...regions.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, items]) => ({ region, locations: items }));
}
