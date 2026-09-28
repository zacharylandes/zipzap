import { NextResponse } from "next/server";
import { loadPropertyEnrichment } from "@/lib/enrichment/load-enrichment";
import { getPool } from "@/lib/db/pool";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  const { id: raw } = await context.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  try {
    const enrichment = await loadPropertyEnrichment(pool, id);
    if (!enrichment) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(enrichment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "enrichment failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
