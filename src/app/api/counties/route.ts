import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";

export async function GET() {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  try {
    const result = await pool.query(
      `
      SELECT fips, name, state, parcel_source_status, parcel_status_reason,
             zoning_source_status, zoning_status_reason, population_note
      FROM county
      WHERE state = 'TX'
      ORDER BY name
      `,
    );
    return NextResponse.json({ counties: result.rows });
  } catch {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
