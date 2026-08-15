import type { Listing, SearchInput, SourceStatus } from "@/search/schema";

export type AdapterResult = {
  listings: Listing[];
  status: SourceStatus;
};

export type SourceAdapter = {
  id: string;
  name: string;
  countries: SearchInput["country"][];
  buildSearchUrl: (input: SearchInput) => string;
  search: (input: SearchInput) => Promise<AdapterResult>;
};

export type RawListing = {
  title?: string | null;
  price?: number | string | null;
  currency?: string | null;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  area?: number | string | null;
  areaUnit?: string | null;
  location?: string | null;
  address?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  url?: string | null;
};
