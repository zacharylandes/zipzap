import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";

export async function GET(_request: Request, context: { params: Promise<{ fips: string }> }) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  const { fips } = await context.params;
  if (!/^\d{5}$/.test(fips)) return NextResponse.json({ error: "invalid fips" }, { status: 400 });
  try {
    const result = await pool.query(
      `
      SELECT fips, name, state, parcel_source_status, parcel_status_reason,
             zoning_source_status, zoning_status_reason, population_estimate, population_note,
             last_parcel_update, last_zoning_update,
             ST_AsGeoJSON(ST_Transform(ST_Simplify(geom, 500), 4326)) AS geometry
      FROM county
      WHERE state = 'TX' AND fips = $1
      `,
      [fips],
    );
    const row = result.rows[0];
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({
      ...row,
      geometry: row.geometry ? JSON.parse(row.geometry) : null,
    });
  } catch {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
