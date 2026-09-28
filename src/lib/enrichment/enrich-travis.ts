import { attrNumber, attrString, featureObjectId, queryLayerIntersects } from "@/lib/gis/arcgis-query";
import {
  AUSTIN_GIS,
  AUSTIN_OVERLAY_LAYERS,
  TX_BUILDING_FOOTPRINTS,
  type AustinLayer,
} from "@/lib/enrichment/austin-layers";
import { lotAreaConversions, parseStratmapBuilding } from "@/lib/enrichment/stratmap-attrs";
import type {
  ConstraintHit,
  DevelopmentHistorySummary,
  EnrichmentSourceRef,
  OrdinanceHit,
  PermitHit,
  PlanningHit,
  PropertyEnrichment,
  ZoningHit,
} from "@/lib/enrichment/types";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type PropertyRow = {
  id: number;
  parcel_id: string;
  county: string;
  county_fips: string;
  state: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  lot_area: string | null;
  lot_area_unit: string | null;
  geometry: string | null;
  raw_payload: Record<string, unknown> | null;
};

export function enrichmentCacheFresh(retrievedAt: Date, now = Date.now()): boolean {
  return now - retrievedAt.getTime() < CACHE_TTL_MS;
}

export async function buildTravisEnrichment(row: PropertyRow): Promise<PropertyEnrichment> {
  const retrievedAt = new Date().toISOString();
  const lotArea = row.lot_area === null ? null : Number(row.lot_area);
  const conversions = lotAreaConversions(lotArea, row.lot_area_unit);
  const raw = row.raw_payload ?? {};
  const stratmap = parseStratmapBuilding(raw);
  const geometry = row.geometry
    ? (JSON.parse(row.geometry) as GeoJSON.Polygon | GeoJSON.MultiPolygon)
    : null;

  const notes: string[] = [];
  const sources: EnrichmentSourceRef[] = [];

  const property = {
    parcelId: row.parcel_id,
    county: row.county,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    latitude: row.latitude,
    longitude: row.longitude,
    lotArea,
    lotAreaUnit: row.lot_area_unit,
    lotAreaSqft: conversions.sqft,
    lotAreaAcres: conversions.acres,
    lotAreaSqftDerived: conversions.sqftDerived,
    lotAreaAcresDerived: conversions.acresDerived,
  };

  let buildingFootprintSqft: number | null = null;
  let buildingFootprintSqftDerived = false;
  let buildingFootprintSource: string | null = null;
  let coaBuildingFootprintCount: number | null = null;
  let imperviousPatchCount: number | null = null;

  const zoning: ZoningHit[] = [];
  const ordinances: OrdinanceHit[] = [];
  const overlays: ZoningHit[] = [];
  const planning: PlanningHit[] = [];
  const constraints: ConstraintHit[] = [];
  const permits: PermitHit[] = [];

  const jurisdiction =
    row.county_fips === "48453" ? ("austin" as const) : row.state === "TX" ? ("travis_county_only" as const) : ("unsupported" as const);

  if (!geometry) {
    notes.push("Parcel geometry is missing; spatial enrichment was skipped.");
  } else if (jurisdiction === "austin") {
    await Promise.all([
      loadZoningBase(geometry, zoning, sources, retrievedAt),
      loadOrdinances(geometry, ordinances, sources, retrievedAt),
      loadOverlays(geometry, overlays, sources, retrievedAt),
      loadPlanningLayers(geometry, planning, sources, retrievedAt),
      loadOverlayConstraints(geometry, constraints, sources, retrievedAt),
      loadPermits(geometry, permits, sources, retrievedAt),
      loadCoaBuildingFootprints(geometry).then((result) => {
        coaBuildingFootprintCount = result.count;
        if (result.sqft !== null) {
          buildingFootprintSqft = result.sqft;
          buildingFootprintSqftDerived = true;
          buildingFootprintSource = AUSTIN_GIS.coaBuildingFootprints2023.name;
        }
      }),
      loadImperviousCount(geometry).then((count) => {
        imperviousPatchCount = count;
      }),
      loadFootprintsTx(geometry).then((sqft) => {
        if (buildingFootprintSqft === null && sqft !== null) {
          buildingFootprintSqft = sqft;
          buildingFootprintSqftDerived = true;
          buildingFootprintSource = "Texas FDST Building Footprints";
        }
      }),
    ]);
  } else if (jurisdiction === "travis_county_only") {
    notes.push("Live City of Austin layers apply only within Austin/ETJ; county-only enrichment uses StratMap attributes.");
  }

  if (Object.keys(raw).length > 0) {
    sources.push({
      name: "StratMap Land Parcels 2025",
      agency: "Texas Geographic Information Office",
      url: "https://geographic.texas.gov/stratmap/land-parcels",
      retrievedAt,
    });
  }

  return {
    propertyId: row.id,
    jurisdiction,
    retrievedAt,
    property,
    building: {
      buildingFootprintSqft,
      buildingFootprintSqftDerived,
      buildingFootprintSource,
      coaBuildingFootprintCount,
      imperviousPatchCount,
      buildingSqft: stratmap.buildingSqft,
      yearBuilt: stratmap.yearBuilt,
      stories: stratmap.stories,
      units: stratmap.units,
      propertyUse: stratmap.propertyUse,
      landUse: stratmap.landUse,
      assessedValue: stratmap.assessedValue,
      improvementValue: stratmap.improvementValue,
      landValue: stratmap.landValue,
      taxYear: stratmap.taxYear,
    },
    zoning,
    storedZoning: [],
    ordinances,
    overlays,
    planning,
    constraints,
    permits,
    developmentHistory: summarizeDevelopmentHistory(permits),
    sources,
    notes,
  };
}

function summarizeDevelopmentHistory(permits: PermitHit[]): DevelopmentHistorySummary {
  const demolition = permits.filter((p) => p.sourceUrl.includes("/MapServer/2"));
  const planReview = permits.filter((p) => p.sourceUrl.includes("/MapServer/9"));
  const building = permits.filter((p) => p.sourceUrl.includes("/MapServer/0"));
  const dates = permits.map((p) => p.issueDate).filter(Boolean) as string[];
  dates.sort();
  return {
    permitCount: building.length,
    demolitionCount: demolition.length,
    planReviewCount: planReview.length,
    latestIssueDate: dates.length > 0 ? dates[dates.length - 1] : null,
  };
}

async function loadZoningBase(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  zoning: ZoningHit[],
  sources: EnrichmentSourceRef[],
  retrievedAt: string,
) {
  const layer = AUSTIN_GIS.zoningBase;
  const features = await queryLayerIntersects(layer.url, geometry);
  for (const feature of features) {
    const attrs = feature.attributes;
    zoning.push({
      layerKey: layer.key,
      layerName: layer.name,
      sourceUrl: layer.url,
      featureId: featureObjectId(attrs),
      zoningCode: attrString(attrs, "ZONING_ZTYPE", "ZONING"),
      zoningBase: attrString(attrs, "ZONING_BASE"),
      zoningType: attrString(attrs, "ZONING_ZTYPE"),
      overlayName: null,
      intersectionPct: null,
      attributes: sanitizeAttrs(attrs),
    });
  }
  if (features.length > 0) {
    sources.push({ name: layer.name, agency: layer.agency, url: layer.url, retrievedAt });
  }
}

async function loadOrdinances(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ordinances: OrdinanceHit[],
  sources: EnrichmentSourceRef[],
  retrievedAt: string,
) {
  const layer = AUSTIN_GIS.zoningOrdinance;
  const features = await queryLayerIntersects(layer.url, geometry);
  for (const feature of features) {
    const attrs = feature.attributes;
    ordinances.push({
      ordinanceNumber: attrString(attrs, "ZONING_ORDINANCE_NUMBER"),
      ordinanceUrl: attrString(attrs, "ZONING_ORDINANCE_PATH"),
      sourceUrl: layer.url,
      featureId: featureObjectId(attrs),
    });
  }
  if (features.length > 0) {
    sources.push({ name: layer.name, agency: layer.agency, url: layer.url, retrievedAt });
  }
}

async function loadOverlays(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  overlays: ZoningHit[],
  sources: EnrichmentSourceRef[],
  retrievedAt: string,
) {
  const layers = [
    AUSTIN_GIS.historicLandmark,
    AUSTIN_GIS.localHistoricDistrict,
    AUSTIN_GIS.nationalHistoricDistrict,
  ];
  for (const layer of layers) {
    const features = await queryLayerIntersects(layer.url, geometry);
    for (const feature of features) {
      const attrs = feature.attributes;
      overlays.push({
        layerKey: layer.key,
        layerName: layer.name,
        sourceUrl: layer.url,
        featureId: featureObjectId(attrs),
        zoningCode: null,
        zoningBase: null,
        zoningType: null,
        overlayName:
          attrString(attrs, "ZONING_OVERLAY_NAME", "BUILDING_NAME", "GIS_ID") ??
          attrString(attrs, "ADDRESS"),
        intersectionPct: null,
        attributes: sanitizeAttrs(attrs),
      });
    }
    if (features.length > 0) {
      sources.push({ name: layer.name, agency: layer.agency, url: layer.url, retrievedAt });
    }
  }
}

async function loadPermits(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  permits: PermitHit[],
  sources: EnrichmentSourceRef[],
  retrievedAt: string,
) {
  const layers = [
    AUSTIN_GIS.buildingPermits,
    AUSTIN_GIS.demolitionPlanReview,
    AUSTIN_GIS.demolitionPermits,
    AUSTIN_GIS.planReview,
  ];
  for (const layer of layers) {
    const features = await queryLayerIntersects(layer.url, geometry);
    for (const feature of features.slice(0, 40)) {
      const attrs = feature.attributes;
      permits.push({
        permitNumber: attrString(attrs, "PERMIT_NUMBER", "CASE_NUMBER"),
        permitType: attrString(attrs, "PERMIT_TYPE", "SUB_TYPE"),
        status: attrString(attrs, "ISSUED_PP_STATUS", "STATUS"),
        issueDate: attrString(attrs, "ISSUE_DATE", "APPLICATION_DATE"),
        workDescription: attrString(attrs, "WORK_DESCRIPTION", "DESCRIPTION"),
        squareFootage: attrNumber(attrs, "TOTAL_SQUARE_FOOTAGE", "EXISTING_SQFT", "PROPOSED_SQFT"),
        units: attrNumber(attrs, "NUMBER_OF_UNITS", "UNITS"),
        valuation: attrNumber(attrs, "BUILDING_VALUATION", "TOTAL_JOB_VALUATION", "VALUATION"),
        sourceUrl: layer.url,
      });
    }
    if (features.length > 0) {
      sources.push({ name: layer.name, agency: layer.agency, url: layer.url, retrievedAt });
    }
  }
  permits.sort((a, b) => (b.issueDate ?? "").localeCompare(a.issueDate ?? ""));
}

async function loadPlanningLayers(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  planning: PlanningHit[],
  sources: EnrichmentSourceRef[],
  retrievedAt: string,
) {
  const layers = [
    AUSTIN_GIS.futureLandUse,
    AUSTIN_GIS.landUseInventory,
    AUSTIN_GIS.etodStationAreas,
    AUSTIN_GIS.developmentAgreements,
    ...AUSTIN_OVERLAY_LAYERS.filter((layer) => layer.category === "planning"),
  ];
  await loadGenericPlanning(geometry, layers, planning, sources, retrievedAt);
}

async function loadOverlayConstraints(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  constraints: ConstraintHit[],
  sources: EnrichmentSourceRef[],
  retrievedAt: string,
) {
  const layers = [
    AUSTIN_GIS.imperviousCover2023,
    ...AUSTIN_OVERLAY_LAYERS.filter((layer) => layer.category === "constraint"),
  ];
  for (const layer of layers) {
    const features = await queryLayerIntersects(layer.url, geometry);
    for (const feature of features) {
      const attrs = feature.attributes;
      constraints.push({
        layerKey: layer.key,
        layerName: layer.name,
        label:
          attrString(attrs, "ZONING_OVERLAY_NAME", "FEATURE", "NAME", "BUILDING_NAME") ??
          layer.name,
        sourceUrl: layer.url,
        featureId: featureObjectId(attrs),
        attributes: sanitizeAttrs(attrs),
      });
    }
    if (features.length > 0) pushSource(sources, layer, retrievedAt);
  }
}

async function loadGenericPlanning(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  layers: AustinLayer[],
  planning: PlanningHit[],
  sources: EnrichmentSourceRef[],
  retrievedAt: string,
) {
  for (const layer of layers) {
    const features = await queryLayerIntersects(layer.url, geometry);
    for (const feature of features) {
      const attrs = feature.attributes;
      planning.push({
        layerKey: layer.key,
        layerName: layer.name,
        label:
          attrString(attrs, "FUTURE_LAND_USE", "LAND_USE", "NAME", "PLAN_NAME", "ZONING_OVERLAY_NAME") ??
          null,
        code: attrString(attrs, "FUTURE_LAND_USE", "LAND_USE_CODE", "LU_CODE"),
        ordinanceNumber: attrString(attrs, "ORDINANCE_NUMBER", "ORD_NUM"),
        sourceUrl: layer.url,
        featureId: featureObjectId(attrs),
        attributes: sanitizeAttrs(attrs),
      });
    }
    if (features.length > 0) pushSource(sources, layer, retrievedAt);
  }
}

async function loadCoaBuildingFootprints(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): Promise<{ count: number; sqft: number | null }> {
  const layer = AUSTIN_GIS.coaBuildingFootprints2023;
  const features = await queryLayerIntersects(layer.url, geometry);
  let total = 0;
  for (const feature of features) {
    const area = attrNumber(feature.attributes, "Shape_Area", "SHAPE_Area", "AREA");
    if (area !== null) total += area;
  }
  return { count: features.length, sqft: features.length > 0 && total > 0 ? total : null };
}

async function loadImperviousCount(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): Promise<number | null> {
  const features = await queryLayerIntersects(AUSTIN_GIS.imperviousCover2023.url, geometry);
  return features.length > 0 ? features.length : null;
}

async function loadFootprintsTx(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): Promise<number | null> {
  try {
    const features = await queryLayerIntersects(TX_BUILDING_FOOTPRINTS, geometry);
    let total = 0;
    for (const feature of features) {
      const area = attrNumber(feature.attributes, "AREA", "Shape_Area", "SHAPE_Area", "sqft", "SQFT");
      if (area !== null) total += area;
    }
    return features.length > 0 && total > 0 ? total : null;
  } catch {
    return null;
  }
}

function pushSource(sources: EnrichmentSourceRef[], layer: AustinLayer, retrievedAt: string) {
  if (sources.some((source) => source.url === layer.url)) return;
  sources.push({ name: layer.name, agency: layer.agency, url: layer.url, retrievedAt });
}

function sanitizeAttrs(attrs: Record<string, unknown>): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("Shape") || key === "OBJECTID") continue;
    if (value === null || value === undefined) out[key] = null;
    else if (typeof value === "number") out[key] = value;
    else out[key] = String(value);
  }
  return out;
}

export type { PropertyRow };
