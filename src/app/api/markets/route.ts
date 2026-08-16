import { after } from "next/server";
import { loadMarketsFile } from "@/markets/load";
import {
  DEFAULT_MAX_PRICE,
  DEFAULT_MIN_PRICE,
  MARKETS_PAGE_SIZE,
} from "@/markets/rank";
import { buildMarketsResponse, parseMarketQuery } from "@/markets/query";
import { schedulePrefetchTopZipListings } from "@/search/prefetch";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const file = loadMarketsFile();
    const query = parseMarketQuery(url.searchParams);
    const response = buildMarketsResponse(file, url.searchParams);
    const page = query.page ?? 1;
    const start = (page - 1) * MARKETS_PAGE_SIZE;
    const visible = response.markets.slice(start, start + MARKETS_PAGE_SIZE);
    after(() => {
      schedulePrefetchTopZipListings(visible, {
        minPrice: query.minPrice ?? DEFAULT_MIN_PRICE,
        maxPrice: query.maxPrice ?? DEFAULT_MAX_PRICE,
        country: query.country,
      });
    });
    return Response.json(response);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load market data",
      },
      { status: 500 },
    );
  }
}
