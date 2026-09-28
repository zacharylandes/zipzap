export type PropertySource = {
  name: string;
  agency: string;
  url: string;
  dataset: string;
  retrievedAt: string | null;
  sourceUpdatedAt: string | null;
  attribute: string | null;
};

export type PropertySummary = {
  id: number;
  parcelId: string;
  parcelIdDerived: boolean;
  county: string;
  countyFips: string;
  state: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  lotArea: number | null;
  lotAreaUnit: string | null;
  lotAreaDerived: boolean;
  source: PropertySource;
};

export type PropertyDetail = PropertySummary & {
  latitude: number | null;
  longitude: number | null;
  coordinatesDerived: boolean;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
};

export type SearchResponse = {
  query: string;
  page: number;
  pageSize: number;
  total: number;
  results: PropertySummary[];
  /** Present when address text did not match but a loaded parcel was found at the geocoded point. */
  matchMethod?: "address" | "geocode";
  geocodeMatchedAddress?: string;
  searchNote?: string;
};
