export type EnrichmentSourceRef = {
  name: string;
  agency: string;
  url: string;
  retrievedAt: string;
};

export type EnrichmentProperty = {
  parcelId: string;
  county: string;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  lotArea: number | null;
  lotAreaUnit: string | null;
  lotAreaSqft: number | null;
  lotAreaAcres: number | null;
  lotAreaSqftDerived: boolean;
  lotAreaAcresDerived: boolean;
};

export type EnrichmentBuilding = {
  buildingFootprintSqft: number | null;
  buildingFootprintSqftDerived: boolean;
  buildingFootprintSource: string | null;
  coaBuildingFootprintCount: number | null;
  imperviousPatchCount: number | null;
  buildingSqft: number | null;
  yearBuilt: number | null;
  stories: number | null;
  units: number | null;
  propertyUse: string | null;
  landUse: string | null;
  assessedValue: number | null;
  improvementValue: number | null;
  landValue: number | null;
  taxYear: number | null;
};

export type ZoningHit = {
  layerKey: string;
  layerName: string;
  sourceUrl: string;
  featureId: number | null;
  zoningCode: string | null;
  zoningBase: string | null;
  zoningType: string | null;
  overlayName: string | null;
  intersectionPct: number | null;
  attributes: Record<string, string | number | null>;
};

export type StoredZoningHit = {
  districtCode: string;
  description: string | null;
  intersectionAreaSqft: number | null;
  intersectionPct: number | null;
  layerKey: string;
  attributes: Record<string, unknown>;
  source: "database";
};

export type OrdinanceHit = {
  ordinanceNumber: string | null;
  ordinanceUrl: string | null;
  sourceUrl: string;
  featureId: number | null;
};

export type PermitHit = {
  permitNumber: string | null;
  permitType: string | null;
  status: string | null;
  issueDate: string | null;
  workDescription: string | null;
  squareFootage: number | null;
  units: number | null;
  valuation: number | null;
  sourceUrl: string;
};

export type PlanningHit = {
  layerKey: string;
  layerName: string;
  label: string | null;
  code: string | null;
  ordinanceNumber: string | null;
  sourceUrl: string;
  featureId: number | null;
  attributes: Record<string, string | number | null>;
};

export type ConstraintHit = {
  layerKey: string;
  layerName: string;
  label: string | null;
  sourceUrl: string;
  featureId: number | null;
  attributes: Record<string, string | number | null>;
};

export type DevelopmentHistorySummary = {
  permitCount: number;
  demolitionCount: number;
  planReviewCount: number;
  latestIssueDate: string | null;
};

export type PropertyEnrichment = {
  propertyId: number;
  jurisdiction: "austin" | "travis_county_only" | "unsupported";
  retrievedAt: string;
  property: EnrichmentProperty;
  building: EnrichmentBuilding;
  zoning: ZoningHit[];
  storedZoning: StoredZoningHit[];
  ordinances: OrdinanceHit[];
  overlays: ZoningHit[];
  planning: PlanningHit[];
  constraints: ConstraintHit[];
  permits: PermitHit[];
  developmentHistory: DevelopmentHistorySummary;
  sources: EnrichmentSourceRef[];
  notes: string[];
};
