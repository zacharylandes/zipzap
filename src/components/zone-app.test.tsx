import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ZoneApp } from "@/components/zone-app";

vi.mock("@/components/zone-map", () => ({
  ZoneMap: () => <div data-testid="zone-map" />,
}));

const parcel = {
  id: 1,
  parcelId: "100001",
  parcelIdDerived: false,
  county: "TRAVIS",
  countyFips: "48453",
  state: "TX",
  address: "100 Congress Ave, Austin, TX 78701",
  city: "AUSTIN",
  zip: "78701",
  lotArea: 0.25,
  lotAreaUnit: "Acres",
  lotAreaDerived: false,
  source: {
    name: "StratMap Land Parcels 2025",
    agency: "Texas Geographic Information Office",
    url: "https://geographic.texas.gov/stratmap/land-parcels",
    dataset: "stratmap-2025-land-parcels",
    retrievedAt: "2026-09-27T00:00:00.000Z",
    sourceUpdatedAt: "2025-02-01",
    attribute: "TRAVIS CENTRAL APPRAISAL DISTRICT",
  },
  latitude: 30.26,
  longitude: -97.74,
  coordinatesDerived: true,
  geometry: null,
};

describe("ZoneApp", () => {
  it("shows the parcel id and source for a known address", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/api/coverage")) {
          return json({ loaded: [{ fips: "48453", name: "Travis", parcel_source_status: "AVAILABLE", properties: 2 }] });
        }
        if (url.includes("/api/properties/search")) {
          return json({ query: "100 Congress", page: 1, pageSize: 20, total: 1, results: [parcel] });
        }
        if (url.includes("/enrichment")) {
          return json({
            propertyId: 1,
            jurisdiction: "austin",
            retrievedAt: "2026-09-27T00:00:00.000Z",
            property: { parcelId: "100001", county: "TRAVIS", address: parcel.address, city: "AUSTIN", state: "TX", zip: "78701", latitude: 30.26, longitude: -97.74, lotArea: 0.25, lotAreaUnit: "Acres", lotAreaSqft: null, lotAreaAcres: null, lotAreaSqftDerived: false, lotAreaAcresDerived: false },
            building: {
              buildingFootprintSqft: null,
              buildingFootprintSqftDerived: false,
              buildingFootprintSource: null,
              coaBuildingFootprintCount: null,
              imperviousPatchCount: null,
              buildingSqft: null,
              yearBuilt: null,
              stories: null,
              units: null,
              propertyUse: null,
              landUse: null,
              assessedValue: null,
              improvementValue: null,
              landValue: null,
              taxYear: null,
            },
            zoning: [],
            storedZoning: [],
            ordinances: [],
            overlays: [],
            planning: [],
            constraints: [],
            permits: [],
            developmentHistory: {
              permitCount: 0,
              demolitionCount: 0,
              planReviewCount: 0,
              latestIssueDate: null,
            },
            sources: [],
            notes: [],
          });
        }
        if (/\/api\/properties\/\d+$/.test(url)) return json(parcel);
        return json({ error: "not found" }, 404);
      }),
    );

    render(<ZoneApp />);
    await user.type(screen.getByLabelText("Address or parcel ID"), "100 Congress Ave, Austin, TX");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("100001")).toBeInTheDocument();
    expect(screen.getByText(/Texas Geographic Information Office/)).toBeInTheDocument();
    expect(screen.getByText("2026-09-27")).toBeInTheDocument();
  });

  it("says the address was not found and does not invent a lot area", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/api/coverage")) return json({ loaded: [] });
        if (url.includes("/api/properties/search")) {
          return json({ query: "500 Main", page: 1, pageSize: 20, total: 0, results: [] });
        }
        return json({});
      }),
    );

    render(<ZoneApp />);
    await user.type(screen.getByLabelText("Address or parcel ID"), "500 Main St, Houston, TX");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("That address was not found in the loaded parcels.")).toBeInTheDocument();
    expect(screen.queryByText(/lot area/i)).not.toBeInTheDocument();
    expect(screen.queryByText("100001")).not.toBeInTheDocument();
  });
});

function json(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: async () => body,
  });
}
