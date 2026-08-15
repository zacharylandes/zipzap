import { NextResponse } from "next/server";
import { runSearch } from "@/search/search";
import { searchInputSchema, type SearchResponse } from "@/search/schema";

function mockResponse(country: SearchResponse["country"]): SearchResponse {
  return {
    country,
    currency: country === "US" ? "USD" : country === "MX" ? "MXN" : "EUR",
    cached: false,
    sources: [
      {
        sourceId: "mock",
        sourceName: "Mock Source",
        status: "ok",
        count: 2,
      },
    ],
    listings: [
      {
        id: "mock:1",
        sourceId: "mock",
        sourceName: "Mock Source",
        title: "Sunny 2-bed apartment near the park",
        price: 1250,
        currency: country === "US" ? "USD" : "EUR",
        bedrooms: 2,
        bathrooms: 1,
        area: 85,
        areaUnit: "sqm",
        location: "Centro",
        thumbnailUrl: null,
        url: "https://example.com/listing/1",
      },
      {
        id: "mock:2",
        sourceId: "mock",
        sourceName: "Mock Source",
        title: "Bright loft with balcony",
        price: 1890,
        currency: country === "US" ? "USD" : "EUR",
        bedrooms: 1,
        bathrooms: 1,
        area: 62,
        areaUnit: "sqm",
        location: "Downtown",
        thumbnailUrl: null,
        url: "https://example.com/listing/2",
      },
    ],
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = searchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (process.env.HOUSE_SEARCH_MOCK_SEARCH === "1") {
    return NextResponse.json(mockResponse(parsed.data.country));
  }

  try {
    const result = await runSearch(parsed.data);
    const anyOk = result.sources.some(
      (s) => s.status === "ok" || s.status === "empty",
    );
    if (!anyOk && result.sources.length > 0) {
      return NextResponse.json(
        {
          error: "No sources could run this search",
          sources: result.sources,
          listings: [],
          cached: false,
          currency: result.currency,
          country: result.country,
        },
        { status: 502 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Search failed unexpectedly",
      },
      { status: 500 },
    );
  }
}
