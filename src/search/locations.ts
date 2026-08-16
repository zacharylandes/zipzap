import type { CountryCode } from "@/search/schema";

export type ListingLocation = {
  label: string;
  /** Exact value passed to portal URL builders (slug or city-province slug). */
  location: string;
  /** Numbeo property-investment city slug (path segment after /in/). */
  numbeoCity: string;
  region: string;
};

/** Curated portal slugs — not shown in the UI for listing browse. */
export const LISTING_LOCATIONS: Record<
  Exclude<CountryCode, "US" | "IT">,
  ListingLocation[]
> = {
  MX: [
    { label: "Ciudad de México", location: "ciudad-de-mexico", numbeoCity: "Mexico-City", region: "Ciudad de México" },
    { label: "Guadalajara", location: "guadalajara", numbeoCity: "Guadalajara", region: "Jalisco" },
    { label: "Monterrey", location: "monterrey", numbeoCity: "Monterrey", region: "Nuevo León" },
    { label: "Querétaro", location: "queretaro", numbeoCity: "Queretaro", region: "Querétaro" },
    { label: "León", location: "leon", numbeoCity: "Leon", region: "Guanajuato" },
    { label: "Puebla", location: "puebla", numbeoCity: "Puebla", region: "Puebla" },
    { label: "Tijuana", location: "tijuana", numbeoCity: "Tijuana", region: "Baja California" },
    { label: "Mérida", location: "merida", numbeoCity: "Merida", region: "Yucatán" },
    { label: "Cancún", location: "cancun", numbeoCity: "Cancun", region: "Quintana Roo" },
    { label: "Playa del Carmen", location: "playa-del-carmen", numbeoCity: "Playa-del-Carmen", region: "Quintana Roo" },
    { label: "Toluca", location: "toluca", numbeoCity: "Toluca", region: "Estado de México" },
    { label: "Aguascalientes", location: "aguascalientes", numbeoCity: "Aguascalientes", region: "Aguascalientes" },
    { label: "San Miguel de Allende", location: "san-miguel-de-allende", numbeoCity: "San-Miguel-de-Allende", region: "Guanajuato" },
    { label: "Cuernavaca", location: "cuernavaca", numbeoCity: "Cuernavaca", region: "Morelos" },
    { label: "Oaxaca", location: "oaxaca-de-juarez", numbeoCity: "Oaxaca", region: "Oaxaca" },
    { label: "Acapulco", location: "acapulco", numbeoCity: "Acapulco", region: "Guerrero" },
    { label: "Veracruz", location: "veracruz", numbeoCity: "Veracruz", region: "Veracruz" },
    { label: "Hermosillo", location: "hermosillo", numbeoCity: "Hermosillo", region: "Sonora" },
    { label: "Chihuahua", location: "chihuahua", numbeoCity: "Chihuahua", region: "Chihuahua" },
    { label: "Saltillo", location: "saltillo", numbeoCity: "Saltillo", region: "Coahuila" },
    { label: "Mazatlán", location: "mazatlan", numbeoCity: "Mazatlan", region: "Sinaloa" },
    { label: "Puerto Vallarta", location: "puerto-vallarta", numbeoCity: "Puerto-Vallarta", region: "Jalisco" },
    { label: "Los Cabos", location: "los-cabos", numbeoCity: "Los-Cabos", region: "Baja California Sur" },
  ],
  ES: [
    { label: "Madrid", location: "madrid-madrid", numbeoCity: "Madrid", region: "Madrid" },
    { label: "Barcelona", location: "barcelona-barcelona", numbeoCity: "Barcelona", region: "Cataluña" },
    { label: "Valencia", location: "valencia-valencia", numbeoCity: "Valencia", region: "Valencia" },
    { label: "Sevilla", location: "sevilla-sevilla", numbeoCity: "Sevilla", region: "Andalucía" },
    { label: "Málaga", location: "malaga-malaga", numbeoCity: "Malaga", region: "Andalucía" },
    { label: "Zaragoza", location: "zaragoza-zaragoza", numbeoCity: "Zaragoza", region: "Aragón" },
    { label: "Bilbao", location: "bilbao-bizkaia", numbeoCity: "Bilbao", region: "País Vasco" },
    { label: "Palma de Mallorca", location: "palma-de-mallorca-balears-illes", numbeoCity: "Palma-de-Mallorca", region: "Baleares" },
    { label: "Alicante", location: "alicante-alacant-alicante", numbeoCity: "Alicante", region: "Valencia" },
    { label: "Murcia", location: "murcia-murcia", numbeoCity: "Murcia", region: "Murcia" },
    { label: "Córdoba", location: "cordoba-cordoba", numbeoCity: "Cordoba", region: "Andalucía" },
    { label: "Granada", location: "granada-granada", numbeoCity: "Granada", region: "Andalucía" },
    { label: "Vigo", location: "vigo-pontevedra", numbeoCity: "Vigo", region: "Galicia" },
    { label: "A Coruña", location: "a-coruna-a-coruna", numbeoCity: "A-Coruna", region: "Galicia" },
    { label: "San Sebastián", location: "donostia-san-sebastian-gipuzkoa", numbeoCity: "San-Sebastian", region: "País Vasco" },
  ],
  CO: [
    { label: "Bogotá", location: "bogota", numbeoCity: "Bogota", region: "Cundinamarca" },
    { label: "Medellín", location: "medellin", numbeoCity: "Medellin", region: "Antioquia" },
    { label: "Cali", location: "cali", numbeoCity: "Cali", region: "Valle del Cauca" },
    { label: "Barranquilla", location: "barranquilla", numbeoCity: "Barranquilla", region: "Atlántico" },
    { label: "Cartagena", location: "cartagena", numbeoCity: "Cartagena", region: "Bolívar" },
    { label: "Bucaramanga", location: "bucaramanga", numbeoCity: "Bucaramanga", region: "Santander" },
    { label: "Pereira", location: "pereira", numbeoCity: "Pereira", region: "Risaralda" },
    { label: "Manizales", location: "manizales", numbeoCity: "Manizales", region: "Caldas" },
    { label: "Cúcuta", location: "cucuta", numbeoCity: "Cucuta", region: "Norte de Santander" },
    { label: "Santa Marta", location: "santa-marta", numbeoCity: "Santa-Marta", region: "Magdalena" },
  ],
  CL: [
    { label: "Santiago", location: "santiago", numbeoCity: "Santiago", region: "Región Metropolitana" },
    { label: "Viña del Mar", location: "vina-del-mar", numbeoCity: "Vina-del-Mar", region: "Valparaíso" },
    { label: "Valparaíso", location: "valparaiso", numbeoCity: "Valparaiso", region: "Valparaíso" },
    { label: "Concepción", location: "concepcion", numbeoCity: "Concepcion", region: "Biobío" },
    { label: "La Serena", location: "la-serena", numbeoCity: "La-Serena", region: "Coquimbo" },
    { label: "Antofagasta", location: "antofagasta", numbeoCity: "Antofagasta", region: "Antofagasta" },
    { label: "Temuco", location: "temuco", numbeoCity: "Temuco", region: "La Araucanía" },
    { label: "Puerto Montt", location: "puerto-montt", numbeoCity: "Puerto-Montt", region: "Los Lagos" },
    { label: "Rancagua", location: "rancagua", numbeoCity: "Rancagua", region: "O'Higgins" },
  ],
  AR: [
    { label: "Buenos Aires (CABA)", location: "capital-federal", numbeoCity: "Buenos-Aires", region: "Ciudad Autónoma de Buenos Aires" },
    { label: "Córdoba", location: "cordoba", numbeoCity: "Cordoba", region: "Córdoba" },
    { label: "Rosario", location: "rosario", numbeoCity: "Rosario", region: "Santa Fe" },
    { label: "Mendoza", location: "mendoza", numbeoCity: "Mendoza", region: "Mendoza" },
    { label: "La Plata", location: "la-plata", numbeoCity: "La-Plata", region: "Buenos Aires" },
    { label: "Mar del Plata", location: "mar-del-plata", numbeoCity: "Mar-del-Plata", region: "Buenos Aires" },
    { label: "Salta", location: "salta", numbeoCity: "Salta", region: "Salta" },
    { label: "San Miguel de Tucumán", location: "tucuman", numbeoCity: "Tucuman", region: "Tucumán" },
  ],
  PE: [
    { label: "Lima", location: "lima", numbeoCity: "Lima", region: "Lima" },
    { label: "Arequipa", location: "arequipa", numbeoCity: "Arequipa", region: "Arequipa" },
    { label: "Cusco", location: "cusco", numbeoCity: "Cusco", region: "Cusco" },
    { label: "Trujillo", location: "trujillo", numbeoCity: "Trujillo", region: "La Libertad" },
    { label: "Piura", location: "piura", numbeoCity: "Piura", region: "Piura" },
    { label: "Chiclayo", location: "chiclayo", numbeoCity: "Chiclayo", region: "Lambayeque" },
  ],
};

export function allListingLocations(): ListingLocation[] {
  return Object.values(LISTING_LOCATIONS).flat();
}

export function findListingLocation(
  country: CountryCode,
  location: string,
): ListingLocation | undefined {
  return listingLocationsForCountry(country).find((entry) => entry.location === location);
}

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
