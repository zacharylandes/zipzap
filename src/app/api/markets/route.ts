import { loadMarketsFile } from "@/markets/load";
import { buildMarketsResponse } from "@/markets/query";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const file = loadMarketsFile();
    return Response.json(buildMarketsResponse(file, url.searchParams));
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
