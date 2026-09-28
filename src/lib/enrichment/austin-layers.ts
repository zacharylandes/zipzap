export type AustinLayer = {
  key: string;
  name: string;
  url: string;
  agency: string;
  category: "zoning" | "planning" | "constraint" | "permit" | "building";
};

const COA = "City of Austin, Geospatial Services – Data Development";
const DSD = "City of Austin Development Services Department";
const PLANNING = "City of Austin Planning";

export const AUSTIN_GIS = {
  zoningBase: {
    key: "zoning_base",
    name: "City of Austin Zoning",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_1/MapServer/0",
    agency: COA,
    category: "zoning",
  },
  zoningOrdinance: {
    key: "zoning_ordinance",
    name: "City of Austin Zoning Ordinance",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_1/MapServer/3",
    agency: COA,
    category: "zoning",
  },
  historicLandmark: {
    key: "historic_landmark",
    name: "City of Austin Historic Landmarks",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_3/MapServer/0",
    agency: PLANNING,
    category: "constraint",
  },
  localHistoricDistrict: {
    key: "local_historic_district",
    name: "Local Historic Districts",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_3/MapServer/1",
    agency: PLANNING,
    category: "constraint",
  },
  nationalHistoricDistrict: {
    key: "national_historic_district",
    name: "National Register Historic Districts",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_3/MapServer/2",
    agency: PLANNING,
    category: "constraint",
  },
  buildingPermits: {
    key: "building_permits",
    name: "City of Austin Building Permits",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Permits/MapServer/0",
    agency: DSD,
    category: "permit",
  },
  demolitionPermits: {
    key: "demolition_permits",
    name: "City of Austin Demolition Permits",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Permits/MapServer/2",
    agency: DSD,
    category: "permit",
  },
  demolitionPlanReview: {
    key: "demolition_plan_review",
    name: "Demolition Plan Review (In Review)",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Permits/MapServer/1",
    agency: DSD,
    category: "permit",
  },
  planReview: {
    key: "plan_review",
    name: "City of Austin Plan Review Cases",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Permits/MapServer/9",
    agency: DSD,
    category: "permit",
  },
  futureLandUse: {
    key: "future_land_use",
    name: "Future Land Use Map (neighborhood planning aggregation)",
    url: "https://maps.austintexas.gov/arcgis/rest/services/PropertyProfile/LongRangePlanning/MapServer/4",
    agency: DSD,
    category: "planning",
  },
  landUseInventory: {
    key: "land_use_inventory",
    name: "Land Use Inventory",
    url: "https://maps.austintexas.gov/arcgis/rest/services/PropertyProfile/LongRangePlanning/MapServer/5",
    agency: DSD,
    category: "planning",
  },
  etodStationAreas: {
    key: "etod_station_areas",
    name: "ETOD Typology Station Areas",
    url: "https://maps.austintexas.gov/arcgis/rest/services/PropertyProfile/LongRangePlanning/MapServer/3",
    agency: DSD,
    category: "planning",
  },
  developmentAgreements: {
    key: "development_agreements",
    name: "Development Agreements",
    url: "https://maps.austintexas.gov/arcgis/rest/services/PropertyProfile/LongRangePlanning/MapServer/10",
    agency: DSD,
    category: "planning",
  },
  coaBuildingFootprints2023: {
    key: "coa_building_2023",
    name: "Building Footprints 2023",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/PlanimetricsSurvey_1/MapServer/0",
    agency: "City of Austin",
    category: "building",
  },
  imperviousCover2023: {
    key: "impervious_2023",
    name: "Impervious Cover 2023",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/PlanimetricsSurvey_1/MapServer/1",
    agency: "City of Austin Watershed Protection",
    category: "constraint",
  },
} as const satisfies Record<string, AustinLayer>;

/** High-signal overlay polygons (Zoning_2) queried on parcel select. */
export const AUSTIN_OVERLAY_LAYERS: AustinLayer[] = [
  {
    key: "etod_overlay",
    name: "ETOD Overlay",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_2/MapServer/14",
    agency: COA,
    category: "constraint",
  },
  {
    key: "wildland_urban_interface",
    name: "Wildland Urban Interface 2024",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_2/MapServer/31",
    agency: COA,
    category: "constraint",
  },
  {
    key: "barton_springs_overlay",
    name: "Barton Springs Overlay",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_2/MapServer/2",
    agency: COA,
    category: "constraint",
  },
  {
    key: "capitol_view_corridors",
    name: "Capitol View Corridors",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_2/MapServer/4",
    agency: COA,
    category: "constraint",
  },
  {
    key: "waterfront_overlay",
    name: "Waterfront Overlay",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_2/MapServer/29",
    agency: COA,
    category: "constraint",
  },
  {
    key: "neighborhood_planning_areas",
    name: "Neighborhood Planning Areas",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_2/MapServer/20",
    agency: COA,
    category: "planning",
  },
  {
    key: "residential_design_standards",
    name: "Residential Design Standards",
    url: "https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_2/MapServer/22",
    agency: COA,
    category: "constraint",
  },
];

export const TX_BUILDING_FOOTPRINTS =
  "https://feature.geographic.texas.gov/arcgis/rest/services/FDST/BuildingFootprints/MapServer/0";
