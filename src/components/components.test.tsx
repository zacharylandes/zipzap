import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchForm } from "@/components/search-form";
import { ListingCard } from "@/components/listing-card";
import { SourceStatusList } from "@/components/source-status";
import { LISTING_LOCATIONS } from "@/search/locations";

describe("SearchForm", () => {
  it("serializes filters on submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SearchForm country="MX" locations={LISTING_LOCATIONS.MX} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByLabelText("City"), "guadalajara");
    await user.type(screen.getByLabelText("Minimum price in MXN"), "200000");
    await user.type(screen.getByLabelText("Bedrooms"), "3");
    await user.click(screen.getByRole("button", { name: "Search listings" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        country: "MX",
        location: "guadalajara",
        listingType: "sale",
        minPrice: 200000,
        bedrooms: 3,
      }),
    );
  });
});

describe("ListingCard", () => {
  it("falls back when thumbnail is missing", () => {
    render(
      <ListingCard
        listing={{
          id: "1",
          sourceId: "realtor",
          sourceName: "Realtor.com",
          title: "Test home",
          price: 400000,
          currency: "USD",
          bedrooms: 3,
          bathrooms: 2,
          area: 1800,
          areaUnit: "sqft",
          location: "Austin",
          thumbnailUrl: null,
          url: "https://example.com/home",
        }}
      />,
    );
    expect(screen.getByText("No photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view photo of test home/i })).toBeInTheDocument();
  });

  it("renders the listing thumbnail", () => {
    render(
      <ListingCard
        listing={{
          id: "1",
          sourceId: "realtor",
          sourceName: "Realtor.com",
          title: "Test home",
          price: 120000,
          currency: "USD",
          bedrooms: 3,
          bathrooms: 2,
          area: 1400,
          areaUnit: "sqft",
          location: "Oklahoma City",
          thumbnailUrl: "https://ap.rdcpix.com/example.jpg",
          url: "https://example.com/home",
        }}
      />,
    );
    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "https://ap.rdcpix.com/example.jpg",
    );
  });

  it("opens a large thumbnail when the home is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ListingCard
        listing={{
          id: "1",
          sourceId: "realtor",
          sourceName: "Realtor.com",
          title: "Test home",
          price: 120000,
          currency: "USD",
          bedrooms: 3,
          bathrooms: 2,
          area: 1400,
          areaUnit: "sqft",
          location: "Oklahoma City",
          thumbnailUrl: "https://ap.rdcpix.com/exampleod-w480_h360.jpg",
          url: "https://example.com/home",
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /view photo of test home/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("img")).toHaveAttribute(
      "src",
      "https://ap.rdcpix.com/exampleod-w1024_h768.jpg",
    );
    expect(screen.getByRole("link", { name: /open listing/i })).toHaveAttribute(
      "href",
      "https://example.com/home",
    );
  });

  it("shows gross yield when present", () => {
    render(
      <ListingCard
        listing={{
          id: "1",
          sourceId: "realtor",
          sourceName: "Realtor.com",
          title: "Test home",
          price: 120000,
          currency: "USD",
          bedrooms: 3,
          bathrooms: 2,
          area: 1400,
          areaUnit: "sqft",
          location: "Oklahoma City",
          thumbnailUrl: null,
          url: "https://example.com/home",
          estimatedMonthlyRent: 1400,
          grossYield: 0.14,
          crimeVsNational: 0.7,
        }}
      />,
    );
    expect(screen.getByText(/14\.0% gross yield/)).toBeInTheDocument();
    expect(screen.getByText(/Crime 0\.70× national/)).toBeInTheDocument();
  });
});

describe("SourceStatusList", () => {
  it("shows partial source notices", () => {
    render(
      <SourceStatusList
        sources={[
          {
            sourceId: "realtor",
            sourceName: "Realtor.com",
            status: "error",
            count: 0,
            message: "blocked",
          },
        ]}
      />,
    );
    expect(screen.getByText(/blocked/)).toBeInTheDocument();
  });
});
