import type { Pool } from "pg";
import type { StoredZoningHit } from "@/lib/enrichment/types";

export async function loadStoredZoningHits(pool: Pool, propertyId: number): Promise<StoredZoningHit[]> {
  const result = await pool.query<{
    district_code: string;
    description: string | null;
    intersection_area: number | null;
    intersection_percentage: number | null;
    layer_key: string;
    attributes: Record<string, unknown> | null;
  }>(
    `
    SELECT
      zd.district_code,
      zd.description,
      pz.intersection_area,
      pz.intersection_percentage,
      zd.layer_key,
      zd.attributes
    FROM property_zoning pz
    JOIN zoning_district zd ON zd.id = pz.zoning_district_id
    WHERE pz.property_id = $1
    ORDER BY pz.intersection_percentage DESC NULLS LAST, zd.district_code
    `,
    [propertyId],
  );
  return result.rows.map((row) => ({
    districtCode: row.district_code,
    description: row.description,
    intersectionAreaSqft: row.intersection_area === null ? null : Number(row.intersection_area),
    intersectionPct: row.intersection_percentage === null ? null : Number(row.intersection_percentage),
    layerKey: row.layer_key,
    attributes: row.attributes ?? {},
    source: "database" as const,
  }));
}
