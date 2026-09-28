import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
import { parcelsInBbox } from "@/lib/properties/search";

const MAX_SPAN = 0.2;

export async function GET(request: Request) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  const url = new URL(request.url);
  const bbox = url.searchParams.get("bbox");
  if (!bbox) return NextResponse.json({ error: "bbox is required" }, { status: 400 });
  const parts = bbox.split(",").map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return NextResponse.json({ error: "bbox must be minLon,minLat,maxLon,maxLat" }, { status: 400 });
  }
  const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
  if (maxLon - minLon > MAX_SPAN || maxLat - minLat > MAX_SPAN) {
    return NextResponse.json({ error: "bbox is too large" }, { status: 400 });
  }
  const limit = Number(url.searchParams.get("limit") ?? "200");
  const county = url.searchParams.get("county") ?? undefined;
  try {
    const collection = await parcelsInBbox(pool, [minLon, minLat, maxLon, maxLat], limit, county);
    return NextResponse.json(collection);
  } catch {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
