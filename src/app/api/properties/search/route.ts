import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
import { searchProperties } from "@/lib/properties/search";

export async function GET(request: Request) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ error: "query must be at least 2 characters" }, { status: 400 });
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
  if (!Number.isFinite(page) || !Number.isFinite(pageSize)) {
    return NextResponse.json({ error: "invalid page" }, { status: 400 });
  }
  try {
    const body = await searchProperties(pool, q, page, pageSize);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
