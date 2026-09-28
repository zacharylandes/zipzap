import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";
import { getProperty } from "@/lib/properties/search";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  const { id: raw } = await context.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  try {
    const property = await getProperty(pool, id);
    if (!property) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(property);
  } catch {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
