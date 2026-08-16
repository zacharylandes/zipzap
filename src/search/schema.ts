import { z } from "zod";

export const COUNTRIES = ["MX", "ES", "US", "CO", "CL", "AR", "PE", "IT"] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const LISTING_TYPES = ["rent", "sale"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const COUNTRY_CURRENCY: Record<CountryCode, string> = {
  MX: "MXN",
  ES: "EUR",
  US: "USD",
  CO: "COP",
  CL: "CLP",
  AR: "ARS",
  PE: "PEN",
  IT: "EUR",
};

export const COUNTRY_LABELS: Record<CountryCode, string> = {
  MX: "Mexico",
  ES: "Spain",
  US: "United States",
  CO: "Colombia",
  CL: "Chile",
  AR: "Argentina",
  PE: "Peru",
  IT: "Italy",
};

export const searchInputSchema = z
  .object({
    country: z.enum(COUNTRIES),
    location: z.string().trim().min(2).max(120),
    listingType: z.enum(LISTING_TYPES),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().positive().optional(),
    bedrooms: z.number().int().min(0).max(20).optional(),
    bathrooms: z.number().min(0).max(20).optional(),
    minArea: z.number().positive().optional(),
    maxArea: z.number().positive().optional(),
    zip: z
      .string()
      .trim()
      .regex(/^\d{5}$/)
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.minPrice != null &&
      value.maxPrice != null &&
      value.minPrice > value.maxPrice
    ) {
      ctx.addIssue({
        code: "custom",
        message: "minPrice must be less than or equal to maxPrice",
        path: ["minPrice"],
      });
    }
    if (
      value.minArea != null &&
      value.maxArea != null &&
      value.minArea > value.maxArea
    ) {
      ctx.addIssue({
        code: "custom",
        message: "minArea must be less than or equal to maxArea",
        path: ["minArea"],
      });
    }
  });

export type SearchInput = z.infer<typeof searchInputSchema>;

export const listingSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  sourceName: z.string(),
  title: z.string(),
  price: z.number().nullable(),
  currency: z.string(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  area: z.number().nullable(),
  areaUnit: z.enum(["sqm", "sqft"]).nullable(),
  location: z.string().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  url: z.string().url(),
  zip: z.string().optional(),
  originalPrice: z.number().nullable().optional(),
  originalCurrency: z.string().optional(),
  estimatedMonthlyRent: z.number().nullable().optional(),
  grossYield: z.number().nullable().optional(),
  crimeVsNational: z.number().nullable().optional(),
  rentEstimateSource: z.enum(["zori", "numbeo"]).optional(),
});

export type Listing = z.infer<typeof listingSchema>;

export const sourceStatusSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string(),
  status: z.enum(["ok", "empty", "error", "unsupported"]),
  message: z.string().optional(),
  count: z.number().int().nonnegative(),
});

export type SourceStatus = z.infer<typeof sourceStatusSchema>;

export const searchResponseSchema = z.object({
  listings: z.array(listingSchema),
  sources: z.array(sourceStatusSchema),
  cached: z.boolean(),
  currency: z.string(),
  country: z.enum(COUNTRIES),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

export const MAX_LISTINGS_PER_SOURCE = 40;
export const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
export const SOURCE_TIMEOUT_MS = 65_000;
