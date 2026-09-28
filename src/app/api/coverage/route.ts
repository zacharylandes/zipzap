import { NextResponse } from "next/server";
import { getPool } from "@/lib/db/pool";

export async function GET() {
  const pool = getPool();
  if (!pool) return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  try {
    const counts = await pool.query(
      `
      SELECT parcel_source_status AS status, count(*)::int AS counties
      FROM county
      WHERE state = 'TX'
      GROUP BY parcel_source_status
      `,
    );
    const loaded = await pool.query(
      `
      SELECT c.fips, c.name, c.parcel_source_status, c.parcel_status_reason,
             count(p.id)::int AS properties
      FROM county c
      LEFT JOIN property p ON p.county_fips = c.fips
      WHERE c.state = 'TX' AND c.parcel_source_status <> 'UNKNOWN'
      GROUP BY c.fips, c.name, c.parcel_source_status, c.parcel_status_reason
      ORDER BY c.name
      `,
    );
    return NextResponse.json({
      statuses: counts.rows,
      loaded: loaded.rows,
    });
  } catch {
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
