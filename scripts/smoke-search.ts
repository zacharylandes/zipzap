import { getAllAdapters } from "../src/search/registry";
import type { SearchInput } from "../src/search/schema";

const samples: SearchInput[] = [
  { country: "MX", location: "Ciudad de Mexico", listingType: "rent", maxPrice: 25000, bedrooms: 2 },
  { country: "ES", location: "madrid", listingType: "rent", maxPrice: 1500, bedrooms: 2 },
  { country: "US", location: "Austin, TX", listingType: "sale", minPrice: 300000, maxPrice: 700000, bedrooms: 3 },
  { country: "CO", location: "bogota", listingType: "rent", maxPrice: 4000000, bedrooms: 2 },
  { country: "CL", location: "santiago", listingType: "rent", maxPrice: 800000, bedrooms: 2 },
  { country: "IT", location: "milano", listingType: "rent", maxPrice: 1800, bedrooms: 2 },
];

async function main() {
  const results: Array<Record<string, unknown>> = [];

  for (const input of samples) {
    const adapters = getAllAdapters().filter((a) => a.countries.includes(input.country));
    for (const adapter of adapters) {
      const started = Date.now();
      try {
        const result = await adapter.search(input);
        results.push({
          country: input.country,
          source: adapter.name,
          url: adapter.buildSearchUrl(input),
          status: result.status.status,
          count: result.status.count,
          message: result.status.message ?? null,
          ms: Date.now() - started,
        });
      } catch (error) {
        results.push({
          country: input.country,
          source: adapter.name,
          status: "error",
          count: 0,
          message: error instanceof Error ? error.message : String(error),
          ms: Date.now() - started,
        });
      }
    }
  }

  console.log(JSON.stringify({ results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
